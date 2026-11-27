import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

const strip = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const fail = code => { throw Error(code); };

export function listOfficialPoisonousEssenceMarksV1(current, policy) {
  const history = current.poisonousEssencePhaseEndHistory || [];
  if (!Array.isArray(history)) fail('POISONOUS_ESSENCE_HISTORY_INVALID');
  const completed = new Set(history.flatMap(row => {
    if (row.resolutionHash !== hash(strip(row, ['resolutionHash']))) fail('POISONOUS_ESSENCE_HISTORY_INVALID');
    return row.markHashes;
  }));
  return current.pieces.flatMap(piece => (piece.statuses || []).filter(status => status?.sourceDefinitionId === policy.definitionId)
    .map(status => {
      if (status.statusEffectHash !== hash(strip(status, ['statusEffectHash']))
        || status.sourceFeatureHash !== policy.sourceFeatureHash || status.targetPieceId !== piece.id
        || status.sourcePieceId !== piece.id || status.sourceSideKey !== piece.sideKey || status.effectKind !== 'poisonous_essence'
        || status.nonLethalDamage !== 2 || status.triggerPhase !== 'assault'
        || status.expiresAt !== 'cleanup_and_refresh' || status.roundApplied !== Number(current.round)) {
        fail('POISONOUS_ESSENCE_MARK_INVALID');
      }
      return { piece, status, resolved: completed.has(status.statusEffectHash) };
    })).sort((left, right) => left.status.statusEffectHash.localeCompare(right.status.statusEffectHash));
}
