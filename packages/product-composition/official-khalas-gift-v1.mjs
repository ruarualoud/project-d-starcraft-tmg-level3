import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_KHALAS_GIFT_DEFINITION_ID = 'unit:tassadar/khala-s-gift-movement-phase@1';
export const OFFICIAL_KHALAS_GIFT_ATOM_ID = 'rule-atom:tassadar-khalas-gift-first-ability-payment-v1';
const schema = 'starcraft_tmg_official_khalas_gift_v1';

export function grantOfficialKhalasGiftV1(state, { source, target, planHash }) {
  const effect = {
    schema, round: Number(state.round), sideKey: source.sideKey,
    sourcePieceId: source.id, targetPieceId: target.id, sourcePlanHash: planHash,
  };
  const effectHash = hash(effect);
  state.officialKhalasGiftByUnit ??= {};
  state.officialKhalasGiftByUnit[target.id] = { ...effect, effectHash };
  return { type: 'khalas_gift_granted', ...effect, effectHash,
    sourceDefinitionId: OFFICIAL_KHALAS_GIFT_DEFINITION_ID, trainingTruth: false };
}

export function quoteOfficialKhalasGiftV1(state, pieceId, sourceKind, base) {
  if (sourceKind !== 'unit_feature') return base;
  const gift = state.officialKhalasGiftByUnit?.[pieceId];
  if (!gift || gift.round !== Number(state.round)) return base;
  const { effectHash, ...body } = gift;
  if (gift.schema !== schema || gift.targetPieceId !== pieceId || effectHash !== hash(body)
    || !state.pieces?.some(piece => piece.id === pieceId && piece.sideKey === gift.sideKey)) {
    throw Error('KHALAS_GIFT_SOURCE_BINDING_INVALID');
  }
  const reduction = Math.min(1, base.effectiveResourceCost);
  return { ...base, effectiveResourceCost: base.effectiveResourceCost - reduction,
    resourceCostReduction: base.resourceCostReduction + reduction,
    khalasGift: { effectHash, sourcePieceId: gift.sourcePieceId, targetPieceId: pieceId, reduction } };
}

export function consumeOfficialKhalasGiftV1(state, quote, { definitionId, planHash }, events) {
  const gift = quote.khalasGift;
  if (!gift) return;
  if (state.officialKhalasGiftByUnit?.[gift.targetPieceId]?.effectHash !== gift.effectHash) {
    throw Error('KHALAS_GIFT_QUOTE_STALE');
  }
  delete state.officialKhalasGiftByUnit[gift.targetPieceId];
  if (!Object.keys(state.officialKhalasGiftByUnit).length) delete state.officialKhalasGiftByUnit;
  events.push({ type: 'khalas_gift_consumed', ...gift, definitionId, planHash,
    effectiveResourceCost: quote.effectiveResourceCost, trainingTruth: false });
}

export function expireOfficialKhalasGiftV1(state, eventKind) {
  if (eventKind !== 'cleanup_and_refresh' || !state.officialKhalasGiftByUnit) return [];
  const events = Object.values(state.officialKhalasGiftByUnit).map(gift => ({
    type: 'khalas_gift_expired', targetPieceId: gift.targetPieceId, effectHash: gift.effectHash, trainingTruth: false,
  }));
  delete state.officialKhalasGiftByUnit;
  return events;
}
