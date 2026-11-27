import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_GROWING_INFESTATION_ID = 'card:hungering_infestation/growing-infestation-any@1';
export const OFFICIAL_FETID_TOUCH_ID = 'card:weighted_pustule/fetid-touch-any@1';
export const OFFICIAL_INFESTATION_RESTRICTION_SPECS_V1 = Object.freeze({
  [OFFICIAL_GROWING_INFESTATION_ID]: Object.freeze({ recordKey: 'tactical_cards:hungering_infestation', abilityName: 'Growing Infestation',
    sourceText: 'Growing Infestation <Passive> <Any Phase>: While an Enemy Unit has the INFESTATION Status, it is not eligible to use or to be targeted by any Enemy Reaction Special Ability, except Restoration.',
    effectKind: 'infestation_reaction_lock', ruleAtomId: 'rule-atom:wave4/infestation-reaction-lock@1' }),
  [OFFICIAL_FETID_TOUCH_ID]: Object.freeze({ recordKey: 'tactical_cards:weighted_pustule', abilityName: 'Fetid Touch',
    sourceText: 'Fetid Touch <Passive> <Any Phase>: While an Enemy Unit has the INFESTATION Status, it cannot resolve the PLACE and set effects and cannot be returned to Reserves.',
    effectKind: 'infestation_placement_reserve_lock', ruleAtomId: 'rule-atom:wave4/infestation-placement-reserve-lock@1' }),
});
const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
const normalized = value => String(value || '').trim().toLowerCase();
export function compileOfficialInfestationRestrictionSpecV1(definition) {
  const spec = OFFICIAL_INFESTATION_RESTRICTION_SPECS_V1[definition.definitionId];
  if (!spec) return null;
  if (definition.recordKey !== spec.recordKey || definition.definitionName !== spec.abilityName
    || definition.sourceText !== spec.sourceText || definition.sourceKind !== 'card_feature'
    || definition.activationKind !== 'passive' || definition.phase !== 'any') throw Error('INFESTATION_RESTRICTION_SOURCE_INVALID');
  return { effectKind: spec.effectKind, actionKind: 'query_modifier', ruleAtomId: spec.ruleAtomId };
}
export function projectOfficialInfestationRestrictionsV1(state, pieceId) {
  const unit = state.pieces?.find(piece => piece.id === pieceId);
  if (!unit) throw Error('INFESTATION_RESTRICTION_UNIT_UNKNOWN');
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  const routes = (bundle?.routes || []).filter(route => OFFICIAL_INFESTATION_RESTRICTION_SPECS_V1[route.definitionId]);
  if (routes.length && (bundle.bundleHash !== hash(without(bundle, 'bundleHash')) || routes.some(route => {
    const spec = OFFICIAL_INFESTATION_RESTRICTION_SPECS_V1[route.definitionId];
    return route.routeHash !== hash(without(route, 'routeHash')) || route.recordKey !== spec.recordKey
      || route.abilityName !== spec.abilityName || route.sourceText !== spec.sourceText || route.effectKind !== spec.effectKind
      || route.ruleAtomId !== spec.ruleAtomId || route.sourceKind !== 'card_feature'
      || route.activationKind !== 'passive' || route.phase !== 'any';
  }))) throw Error('INFESTATION_RESTRICTION_BINDING_INVALID');
  const infected = !unit.isDestroyed && Number(unit.currentModels) > 0 && (unit.statuses || []).some(status =>
    normalized(typeof status === 'string' ? status : status?.statusName || status?.name) === 'infestation');
  const sources = infected ? routes.flatMap(route => Object.entries(state.cardResources || {}).flatMap(([sideKey,cards]) =>
    sideKey === unit.sideKey ? [] : cards.filter(card => card.officialCardRecordKey === route.recordKey).map(card => ({
      sideKey, sourceInstanceId: card.cardInstanceId, definitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, routeHash: route.routeHash, effectKind: route.effectKind, ruleAtomId: route.ruleAtomId })))) : [];
  return { pieceId, infected, cannotResolvePlace: sources.some(row => row.definitionId === OFFICIAL_FETID_TOUCH_ID),
    cannotResolveSet: sources.some(row => row.definitionId === OFFICIAL_FETID_TOUCH_ID),
    cannotReturnToReserves: sources.some(row => row.definitionId === OFFICIAL_FETID_TOUCH_ID),
    sources, trainingTruth: false };
}
export function allowsOfficialInfestationReactionV1(state, { sideKey, sourcePieceId, recipientPieceId, abilityName }) {
  const subjects = [...new Set([sourcePieceId, recipientPieceId].filter(Boolean))];
  const restrictions = subjects.flatMap(id => projectOfficialInfestationRestrictionsV1(state,id).sources)
    .filter(source => source.definitionId === OFFICIAL_GROWING_INFESTATION_ID && source.sideKey !== sideKey);
  return normalized(abilityName) === 'restoration' || restrictions.length === 0;
}
export function assertOfficialInfestationPlacementV1(state, pieceId, effectKind) {
  if (!['place', 'set', 'return_to_reserves'].includes(effectKind)) throw Error('INFESTATION_RESTRICTION_OPERATION_UNKNOWN');
  const facts = projectOfficialInfestationRestrictionsV1(state,pieceId);
  if (facts[effectKind === 'place' ? 'cannotResolvePlace' : effectKind === 'set' ? 'cannotResolveSet' : 'cannotReturnToReserves']) {
    throw Error('INFESTATION_PLACEMENT_RESERVE_LOCKED:' + pieceId + ':' + effectKind);
  }
}
