import { quoteOfficialAncestralWisdomV1 } from './official-ancestral-wisdom-payment-v1.mjs';
import { quoteOfficialFactionUnitResourceConversionV1, readOfficialFactionUnitConversionV1 }
  from '../rule-atoms/official-faction-unit-conversion-v1.mjs';
import { consumeOfficialKhalasGiftV1, quoteOfficialKhalasGiftV1 } from './official-khalas-gift-v1.mjs';
import { consumeOfficialOurMindsAsOneV1, quoteOfficialOurMindsAsOneV1 } from './official-our-minds-as-one-v1.mjs';
import { OFFICIAL_PYLON_INGENUITY_DEFINITION_ID, resolveOfficialBattlefieldAssetAbilityResourceCostV1 }
  from './official-battlefield-asset-family-adapter-v1.mjs';

function quotePylonIngenuity(state, pieceId, cost) {
  const bundle = state.officialBattlefieldAssetFamilySourceBundle;
  if (cost.resourceType !== 'PE' || cost.effectiveResourceCost <= 0
    || cost.sourceDefinitionId === OFFICIAL_PYLON_INGENUITY_DEFINITION_ID
    || bundle?.scope !== 'explicit_source_definition_set'
    || !bundle.definitionIds.includes(OFFICIAL_PYLON_INGENUITY_DEFINITION_ID)) return cost;
  const piece = state.pieces.find(row => row.id === pieceId);
  if (!piece) return cost;
  const request = { sideKey: piece.sideKey, pieceId, resourceType: 'PE', printedResourceCost: cost.effectiveResourceCost };
  const discount = resolveOfficialBattlefieldAssetAbilityResourceCostV1(bundle, state, request);
  if (!discount.applied) return cost;
  return { ...cost, effectiveResourceCost: discount.effectiveResourceCost,
    resourceCostReduction: cost.resourceCostReduction + discount.resourceCostReduction,
    discountSourcePieceId: cost.discountSourcePieceId ?? discount.sourcePieceId,
    pylonIngenuity: { request, sourcePieceId: discount.sourcePieceId } };
}

export function quoteOfficialUnitAbilityModifiersV1(state, pieceId, sourceKind, cost) {
  const convertedCost = quoteOfficialFactionUnitResourceConversionV1(state, pieceId, sourceKind, cost);
  const pylonCost = quotePylonIngenuity(state, pieceId, convertedCost);
  const personalCost = quoteOfficialOurMindsAsOneV1(state, pieceId, sourceKind, pylonCost);
  const giftedCost = quoteOfficialKhalasGiftV1(state, pieceId, sourceKind, personalCost);
  return quoteOfficialAncestralWisdomV1(state, pieceId, sourceKind, giftedCost);
}

export function consumeOfficialUnitAbilityModifiersV1(state, quote, resolution, events) {
  if (quote.factionUnitConversion) {
    const binding = readOfficialFactionUnitConversionV1(state.pieces.find(piece => piece.id === quote.factionUnitConversion.pieceId));
    if (!binding || binding.conversionHash !== quote.factionUnitConversion.conversionHash) throw Error('FACTION_UNIT_PAYMENT_CONVERSION_CHANGED');
    events.push({ type: 'faction_unit_resource_conversion_applied', ...quote.factionUnitConversion,
      paidAbilityDefinitionId: resolution.definitionId, printedResourceType: 'CP', resourceType: quote.resourceType,
      resourceCost: quote.effectiveResourceCost, trainingTruth: false });
  }
  if (quote.pylonIngenuity) {
    const { request, sourcePieceId } = quote.pylonIngenuity;
    const discount = resolveOfficialBattlefieldAssetAbilityResourceCostV1(
      state.officialBattlefieldAssetFamilySourceBundle, state, { ...request, planHash: resolution.planHash }, { consume: true });
    if (!discount.applied || discount.sourcePieceId !== sourcePieceId) throw Error('PYLON_INGENUITY_QUOTE_CHANGED');
    events.push({ type: 'pylon_ingenuity_discount_consumed', definitionId: OFFICIAL_PYLON_INGENUITY_DEFINITION_ID,
      sourcePieceId, pieceId: request.pieceId, discountedAbilityDefinitionId: resolution.definitionId,
      amount: discount.resourceCostReduction, trainingTruth: false });
  }
  consumeOfficialOurMindsAsOneV1(state, quote, resolution, events);
  consumeOfficialKhalasGiftV1(state, quote, resolution, events);
}
