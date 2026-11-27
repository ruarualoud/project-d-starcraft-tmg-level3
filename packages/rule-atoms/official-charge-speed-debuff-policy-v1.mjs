import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID =
  'unit:spec_ops_marauder__marauder_/suppression-shells-assault-phase@1';
export const OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID =
  'unit:marauder/concussive-shells-assault-phase@1';
export const OFFICIAL_CHARGE_DECLARATION_REACTION_ATOM_ID =
  'rule-atom:charge-declaration-before-roll-reaction-window-v1';
const effectSchema = 'starcraft_tmg_charge_speed_debuff_effect_v1';
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'effectHash'));
const seal = value => ({ ...value, effectHash: hash(value) });

export function isOfficialChargeSpeedDebuffRouteV1(route) {
  return [OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID, OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID].includes(route.definitionId)
    && route.effectKind === 'charge_speed_debuff' && route.chargeDeclarationOwner === 'current_source_v1';
}

export function projectOfficialChargeSpeedDebuffV1(state, piece) {
  const effects = (piece?.officialAbilityEffects || []).filter(effect =>
    effect.schema === effectSchema && effect.roundApplied === Number(state.round)
    && (piece.statuses || []).some(status => status.statusEffectHash === effect.effectHash));
  if (!effects.length) return null;
  for (const effect of effects) {
    const route = state.officialReactionFamilySourceBundle?.routes.find(row =>
      row.definitionId === effect.sourceDefinitionId && isOfficialChargeSpeedDebuffRouteV1(row));
    if (!route) throw Error('CHARGE_SPEED_DEBUFF_SOURCE_REQUIRED');
    const resolution = (state.officialReactionResolutionHistory || []).find(row =>
      row.triggerHash === effect.sourceTriggerHash && row.consumedByHost === true);
    const original = resolution?.effects.find(row => row.effectHash === effect.sourceReactionEffectHash);
    const status = piece.statuses.find(row => row.statusEffectHash === effect.effectHash);
    if (effect.effectHash !== hash(withoutHash(effect)) || effect.targetPieceId !== piece.id
      || effect.sourceDefinitionId !== route.definitionId || effect.sourceFeatureHash !== route.sourceFeatureHash
      || effect.speedPenalty !== -route.speedModifier || effect.expiresAt !== 'cleanup_and_refresh'
      || status.statusKind !== 'debuff' || status.characteristic !== 'speed' || status.modifier !== -effect.speedPenalty
      || resolution?.round !== Number(state.round) || resolution.triggerKind !== 'charge_declared'
      || !original || original.attackerPieceId !== piece.id || original.definitionId !== route.definitionId
      || original.sourceFeatureHash !== route.sourceFeatureHash || original.speedModifier !== route.speedModifier
      || original.effectHash !== hash(withoutHash(original))) {
      throw Error('CHARGE_SPEED_DEBUFF_EFFECT_BINDING_INVALID');
    }
  }
  return { speedPenalty: Math.max(...effects.map(effect => effect.speedPenalty)),
    sourceEffectHashes: effects.map(effect => effect.effectHash).sort(), trainingTruth: false };
}

export function materializeOfficialChargeSpeedDebuffV1(state, triggerHash) {
  const routes = state.officialReactionFamilySourceBundle?.routes.filter(isOfficialChargeSpeedDebuffRouteV1);
  if (!routes?.length) throw Error('CHARGE_SPEED_DEBUFF_SOURCE_REQUIRED');
  const resolution = (state.officialReactionResolutionHistory || []).find(row =>
    row.triggerHash === triggerHash && row.consumedByHost === true);
  if (!resolution || resolution.triggerKind !== 'charge_declared' || resolution.round !== Number(state.round)
    || state.phase !== 'assault') throw Error('CHARGE_SPEED_DEBUFF_RESOLUTION_REQUIRED');
  const materialized = [];
  for (const original of resolution.effects) {
    const route = routes.find(row => row.definitionId === original.definitionId);
    if (!route) continue;
    if (original.effectHash !== hash(withoutHash(original)) || original.sourceFeatureHash !== route.sourceFeatureHash
      || original.speedModifier !== route.speedModifier || original.effectDuration !== 'cleanup_and_refresh') {
      throw Error('CHARGE_SPEED_DEBUFF_RESOLUTION_SOURCE_MISMATCH');
    }
    const target = state.pieces.find(piece => piece.id === original.attackerPieceId);
    if (!target) throw Error('CHARGE_SPEED_DEBUFF_TARGET_REQUIRED');
    if ((target.officialAbilityEffects || []).some(effect => effect.schema === effectSchema
      && effect.sourceReactionEffectHash === original.effectHash)) continue;
    const effect = seal({ schema: effectSchema, sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, sourcePieceId: original.sourcePieceId,
      targetPieceId: target.id, sourceTriggerHash: triggerHash, sourceReactionEffectHash: original.effectHash,
      effectKind: 'charge_speed_debuff', speedPenalty: -original.speedModifier,
      roundApplied: Number(state.round), expiresAt: 'cleanup_and_refresh', trainingTruth: false });
    target.officialAbilityEffects = [...(target.officialAbilityEffects || []), effect];
    target.statuses = [...(target.statuses || []), {
      statusName: 'DEBUFF Speed (' + effect.speedPenalty + ')', statusKind: 'debuff', characteristic: 'speed',
      modifier: -effect.speedPenalty, sourceDefinitionId: route.definitionId,
      statusEffectHash: effect.effectHash, removalStep: 'cleanup_and_refresh',
    }];
    materialized.push(effect);
  }
  return materialized;
}
