import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_official_non_lethal_damage_policy_v1',
  version: '1.0.0',
  sourceCoreByteHash: '27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54',
  resolution: 'accumulate_full_damage_defer_casualties',
  ruleAtomIds: Object.freeze([
    'rule-atom:singleton:core-11-non-lethal-damage-accumulation:70938eb8369b',
    'rule-atom:singleton:core-11-non-lethal-no-casualty-removal:cb98ebd1c290',
    'rule-atom:singleton:core-11-non-lethal-standard-damage-trigger:79458dcf31db',
  ]),
});

// Separate opt-in consumer binding: old saved states retain their original
// casualty contract, while new releases fix zero-damage attack resolution.
export const OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_non_lethal_standard_damage_policy_v1',
  version: '1.0.0',
  sourceCoreByteHash: OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1.sourceCoreByteHash,
  requiresPositiveIncomingStandardDamage: true,
  preservesFullMarkerWithoutStandardDamage: true,
});

export function hasOfficialNonLethalStandardDamagePolicyV1(state) {
  const policy = state?.officialNonLethalStandardDamagePolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1)) {
    throw new Error('NON_LETHAL_STANDARD_DAMAGE_POLICY_MISMATCH');
  }
  return true;
}

export function hasOfficialNonLethalDamagePolicyV1(state) {
  const policy = state?.officialNonLethalDamagePolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1)) {
    throw new Error('NON_LETHAL_DAMAGE_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialNonLethalDamageStateV1(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1)) {
    throw new Error('NON_LETHAL_DAMAGE_POLICY_REQUIRED');
  }
  if (hasOfficialNonLethalDamagePolicyV1(state)) return state;
  return { ...state, officialNonLethalDamagePolicy: structuredClone(policy) };
}
