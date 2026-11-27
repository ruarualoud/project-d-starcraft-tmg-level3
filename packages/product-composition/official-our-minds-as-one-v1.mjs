export const OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID = 'unit:high_templar/our-minds-as-one-any-phase@1';
export const OFFICIAL_OUR_MINDS_AS_ONE_ATOM_ID = 'rule-atom:high-templar-our-minds-as-one-v1';
const firstAbilityKey = 'officialOurMindsFirstAbilityByUnit';

export function inspectOfficialOurMindsAsOneV1(state, pieceId) {
  const source = state.officialCharacteristicStatusFamilySourceBundle?.routes.find(route =>
    route.definitionId === OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID);
  if (!source) return null;
  const piece = state.pieces.find(row => row.id === pieceId);
  if (!piece || piece.officialUnitRecordKey !== source.recordKey || !piece.isOnField || piece.isDestroyed
    || Number(piece.currentModels) <= 0
    || Number(piece.structureRules?.specialAbilitiesDisabledThroughRound ?? -1) >= Number(state.round)) return null;
  const meetsSupplyRequirement = piece.currentSupply === source.requiredCurrentSupply;
  const firstAbilityThisRound = state[firstAbilityKey]?.[pieceId]?.round !== Number(state.round);
  return {
    sourceDefinitionId: source.definitionId, sourceRouteHash: source.routeHash,
    currentSupply: piece.currentSupply, meetsSupplyRequirement, firstAbilityThisRound,
    firstAbilityPeReduction: meetsSupplyRequirement && firstAbilityThisRound ? source.firstAbilityPeReduction : 0,
    psionicStormRollModifier: meetsSupplyRequirement ? source.psionicStormRollModifier : 0,
  };
}

export function quoteOfficialOurMindsAsOneV1(state, pieceId, sourceKind, base) {
  if (sourceKind !== 'unit_feature') return base;
  const effect = inspectOfficialOurMindsAsOneV1(state, pieceId);
  if (!effect?.firstAbilityThisRound) return base;
  const reduction = base.resourceType === 'PE' ? Math.min(base.effectiveResourceCost, effect.firstAbilityPeReduction) : 0;
  return { ...base, effectiveResourceCost: base.effectiveResourceCost - reduction,
    resourceCostReduction: base.resourceCostReduction + reduction,
    ourMindsAsOne: { pieceId, sourceRouteHash: effect.sourceRouteHash, currentSupply: effect.currentSupply, reduction } };
}

export function consumeOfficialOurMindsAsOneV1(state, quote, { definitionId, planHash }, events) {
  const effect = quote.ourMindsAsOne;
  if (!effect) return;
  const current = inspectOfficialOurMindsAsOneV1(state, effect.pieceId);
  if (!current?.firstAbilityThisRound || current.sourceRouteHash !== effect.sourceRouteHash
    || current.currentSupply !== effect.currentSupply) throw Error('OUR_MINDS_AS_ONE_QUOTE_STALE');
  const resolution = { round: Number(state.round), definitionId, planHash,
    sourceRouteHash: effect.sourceRouteHash, reduction: effect.reduction };
  state[firstAbilityKey] ??= {};
  state[firstAbilityKey][effect.pieceId] = resolution;
  events.push({ type: 'our_minds_as_one_first_ability_resolved', pieceId: effect.pieceId,
    currentSupply: effect.currentSupply, ...resolution, trainingTruth: false });
}

export function expireOfficialOurMindsFirstAbilityV1(state, eventKind) {
  if (eventKind === 'cleanup_and_refresh' && state[firstAbilityKey]) delete state[firstAbilityKey];
}
