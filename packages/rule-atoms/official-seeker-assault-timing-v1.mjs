import { resolveOfficialNextControllerEffectGroupV1 } from './official-ability-timing-priority-rules-kernel-v1.mjs';

// Receipts bind the declaration to a unit, a controller and the current round.
// Missing or stale sources must never be replaced by a guessed target.
export function pendingOfficialSeekerControllersV1(state) {
  const policy = state.officialSeekerAssaultTiming;
  if (!policy || state.phase !== 'assault') return null;
  const source = state.officialCharacteristicStatusFamilySourceBundle;
  if (policy.sourceBundleHash !== source?.bundleHash || !source.definitionIds.includes(policy.definitionId)) {
    throw Error('SEEKER_ASSAULT_TIMING_SOURCE_MISMATCH');
  }
  const round = Number(state.round);
  const resolved = new Set((state.officialRavenSeekerPhaseEndHistory || [])
    .filter(entry => entry.round === round).map(entry => entry.planHash));
  const pendingEffects = (state.characteristicStatusAbilityHistory || [])
    .filter(entry => entry.definitionId === policy.definitionId && entry.round === round && !resolved.has(entry.planHash))
    .map(entry => ({ effectId: entry.planHash, controllerSideKey: entry.sideKey }));
  return resolveOfficialNextControllerEffectGroupV1({ playerSideKeys: ['player1', 'player2'],
    prioritySideKey: state.firstPlayerSideKey, pendingEffects });
}
