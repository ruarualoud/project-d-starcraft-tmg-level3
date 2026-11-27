import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

// Core NON-LETHAL DAMAGE(X): accumulate the FULL amount, including damage beyond
// HP. A later positive standard-damage resolution owns casualty removal.
export function resolveOfficialNonLethalDamageV1(input) {
  const { targetPieceId, targetModelId, abilityResolutionHash, priorDamageMarker,
    amount, targetHitPoints } = input || {};
  if (typeof targetPieceId !== 'string' || !targetPieceId.trim()
    || typeof targetModelId !== 'string' || !targetModelId.trim()
    || !/^[a-f0-9]{64}$/u.test(abilityResolutionHash || '')
    || !Number.isSafeInteger(priorDamageMarker) || priorDamageMarker < 0
    || !Number.isSafeInteger(amount) || amount < 0
    || !Number.isSafeInteger(targetHitPoints) || targetHitPoints < 1
    || !Number.isSafeInteger(priorDamageMarker + amount)) throw Error('NON_LETHAL_DAMAGE_INPUT_INVALID');
  const body = { schema: 'starcraft_tmg_official_non_lethal_damage_resolution_v1',
    targetPieceId, targetModelId, abilityResolutionHash, priorDamageMarker,
    nonLethalDamage: amount, postDamageMarker: priorDamageMarker + amount,
    targetHitPoints, totalDamageMayMeetOrExceedHitPoints: true,
    casualtyRemovalDeferredUntilLaterStandardDamage: true, targetDestroyed: false,
    casualtyModelIds: [], discardedOverflowDamage: 0, trainingTruth: false };
  return Object.freeze({ ...body, casualtyModelIds: Object.freeze(body.casualtyModelIds), nonLethalResolutionHash: hash(body) });
}
