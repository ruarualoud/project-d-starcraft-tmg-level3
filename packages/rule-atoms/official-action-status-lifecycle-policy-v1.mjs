import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_action_performed_status_policy_v1', version: '1.0.0',
  ruleAtomId: 'rule-atom:source-bound-action-performed-status-expiry-v1',
  statusSourceAdapterId: 'official-characteristic-status-family-adapter-v1',
  expiryEvent: 'action_performed', currentActorOnly: true,
  afterActionFinishExpiresStatus: false, beforeActionFinishCountsAsHold: true,
  trainingTruth: false,
});
// Older descriptors retain their original Hold interpretation during replay.
export const OFFICIAL_HOLD_ACTION_FAQ_V13 = Object.freeze({
  entry: 'faq-v1.3:68',
  byteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
});
export const OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2 = Object.freeze({
  ...OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V1, version: '1.1.0', beforeActionFinishCountsAsHold: false,
});
export const OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3 = Object.freeze({
  ...OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2, version: '1.2.0', observeHiddenLossBeforePassives: true,
});

export function hasOfficialActionStatusLifecyclePolicyV1(state) {
  if (state.officialActionStatusLifecyclePolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialActionStatusLifecyclePolicy, OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V1)
    && !isDeepStrictEqual(state.officialActionStatusLifecyclePolicy, OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2)
    && !isDeepStrictEqual(state.officialActionStatusLifecyclePolicy, OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3)) {
    throw Error('ACTION_STATUS_LIFECYCLE_POLICY_INVALID');
  }
  return true;
}

// Ordinary-action runtimes already meet at the after-action window. Consume
// only this actor's source-owned statuses, retaining other units and durations.
export function consumeOfficialActionPerformedStatusesV1(state, pieceId, cause = 'ordinary_action_completed') {
  if (!hasOfficialActionStatusLifecyclePolicyV1(state)) return [];
  const faqHold = state.officialHoldActionFaq === OFFICIAL_HOLD_ACTION_FAQ_V13.entry;
  if (cause === 'declared_hold' && !faqHold) return [];
  if (cause === 'implicit_hold' && !faqHold && !state.officialActionStatusLifecyclePolicy.beforeActionFinishCountsAsHold) return [];
  const piece = state.pieces.find(row => row.id === pieceId);
  if (!piece) throw Error('ACTION_STATUS_LIFECYCLE_ACTOR_MISSING');
  const removed = [];
  let hiddenRemoved = false;
  piece.statuses = (piece.statuses || []).filter(status => {
    if (status.sourceAdapterId !== OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V1.statusSourceAdapterId
      || status.expiresAt !== 'action_performed') return true;
    const body = Object.fromEntries(Object.entries(status).filter(([key]) => key !== 'statusEffectHash'));
    if (status.targetPieceId !== pieceId || status.statusEffectHash !== hash(body)) {
      throw Error('ACTION_STATUS_LIFECYCLE_STATUS_INVALID');
    }
    if (String(status.statusName || '').toLowerCase() === 'hidden') hiddenRemoved = true;
    removed.push(status.statusEffectHash);
    return false;
  });
  if (!removed.length) return [];
  const hiddenRemains = piece.statuses.some(status => String(typeof status === 'string'
    ? status : status.statusName || status.name || status.status || '').trim().toLowerCase() === 'hidden');
  state.board.effectMarkers = (state.board.effectMarkers || []).filter(marker => !removed.includes(marker.statusEffectHash));
  state.actionPerformedStatusHistory = [...(state.actionPerformedStatusHistory || []), {
    round: Number(state.round), phase: state.phase, pieceId, cause,
    removedStatusEffectHashes: removed, trainingTruth: false,
    ...(state.officialActionStatusLifecyclePolicy.observeHiddenLossBeforePassives
      ? { hiddenStatusLost: hiddenRemoved && !hiddenRemains } : {}),
  }];
  return removed;
}
