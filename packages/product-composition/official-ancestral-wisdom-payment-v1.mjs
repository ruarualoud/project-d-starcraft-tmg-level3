import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';

export const OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID = 'card:templar_archives/ancestral-wisdom-any@1';
export const OFFICIAL_ADVANCED_TRAINING_ID = 'card:academy/advanced-training-any@1';
export const ancestralWisdomProbeKey = 'officialAncestralWisdomQuoteProbe';
export const ancestralWisdomParentKey = 'pendingOfficialAncestralWisdomPayment';

export function readyAncestralWisdomCardV1(state, piece, resourceType = 'PE') {
  const wanted = resourceType === 'CP' ? OFFICIAL_ADVANCED_TRAINING_ID : OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID;
  const route = state.officialReactionFamilySourceBundle?.routes.find(row => row.definitionId === wanted && row.discountedResourceType === resourceType);
  if (!route || piece?.armySlotType !== 'Support' || state.activeSideKey !== piece.sideKey
    || piece.isOnField !== true || piece.isDestroyed || piece.currentModels <= 0) return null;
  const card = state.cardResources?.[piece.sideKey]?.find(row =>
    row.officialCardRecordKey === route.recordKey && row.readiness === 'ready');
  if (!card) return null;
  const activationId = resolveOfficialArmourRollActivationIdV1(state, piece.id);
  if ((state.officialReactionHistory || []).some(row => row.round === Number(state.round)
    && row.sideKey === piece.sideKey && (row.activationId === activationId
      || row.definitionId === route.definitionId && row.sourceInstanceId === card.cardInstanceId))) return null;
  return { cardInstanceId: card.cardInstanceId, definitionId: route.definitionId, sourceRouteHash: route.routeHash,
    reduction: route.resourceCostReduction, activationId };
}

export function quoteOfficialAncestralWisdomV1(state, pieceId, sourceKind, base) {
  const prospective = state[ancestralWisdomProbeKey] === true;
  const parent = state[ancestralWisdomParentKey];
  const authorized = parent?.stage === 'authorized' && parent.pieceId === pieceId
    && parent.round === Number(state.round) && parent.phase === state.phase;
  if ((!prospective && !authorized) || sourceKind !== 'unit_feature'
    || !['PE','CP'].includes(base.resourceType) || base.effectiveResourceCost <= 0) return base;
  const source = prospective ? readyAncestralWisdomCardV1(state, state.pieces.find(row => row.id === pieceId),base.resourceType)
    : parent.source;
  if (!source || (base.resourceType === 'CP') !== (source.definitionId === OFFICIAL_ADVANCED_TRAINING_ID)) return base;
  const reduction = Math.min(source.reduction, base.effectiveResourceCost);
  return { ...base, effectiveResourceCost: base.effectiveResourceCost - reduction,
    resourceCostReduction: base.resourceCostReduction + reduction,
    ancestralWisdom: { ...source, reduction, costBeforeReaction: base.effectiveResourceCost } };
}
