import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
const without = (body, field) => Object.fromEntries(Object.entries(body).filter(([key]) => key !== field));

export function readOfficialRangedCasualtyContextV1(state) {
  const pending = state.pendingCurrentProductRangedCasualtyChoice;
  if (!pending) return null;
  if (typeof pending !== 'object' || Array.isArray(pending)
    || pending.schema !== 'starcraft_tmg_official_current_product_ranged_casualty_choice_v1'
    || pending.pendingHash !== hash(without(pending, 'pendingHash'))
    || pending.attackActionHash !== hash(pending.attackAction)
    || pending.casualtyDomainHash !== pending.casualtyDomain?.domainHash
    || pending.attackerSideKey !== pending.attackAction?.sideKey
    || pending.defenderSideKey === pending.attackerSideKey
    || pending.targetPieceId !== pending.attackAction?.targetId
    || pending.resolvedChance?.resolution?.resolutionHash !== pending.attackResolutionHash
    || pending.resolvedChance?.casualtyDomain?.domainHash !== pending.casualtyDomainHash
    || !Array.isArray(pending.chanceReveals)) throw Error('SELECTED_RANGED_PENDING_CASUALTY_INVALID');
  return pending;
}

export function officialRangedCasualtyBelongsToTargetReactionV1(parent, casualty) {
  return parent.nativeChoices === true && parent.attackKind === undefined
    && casualty.round === parent.round && casualty.phase === parent.phase
    && casualty.attackerSideKey === parent.sideKey && casualty.attackerPieceId === parent.pieceId
    && casualty.targetPieceId === parent.targetId
    && casualty.attackAction.rangedPlan?.profileKey === parent.profileKey
    && casualty.attackAction.rangedPlan?.sourceProfileHash === parent.sourceProfileHash;
}
