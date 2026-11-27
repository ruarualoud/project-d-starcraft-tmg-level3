import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_impact_allocation_policy_v1',
  version: '1.0.0',
  sourceFaqByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  entryId: 'faq-v1.3:73',
  ruleAtomId: 'rule-atom:faq-v1.3-untargeted-impact-structure',
  unitTargetingRequired: false,
  structuresMayReceiveImpact: true,
  targetDiceLayout: 'hit_surge_armour_evade_all_slots_explicit',
});

export function hasOfficialImpactAllocationPolicyV13(state) {
  const policy = state?.officialImpactAllocationPolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_IMPACT_ALLOCATION_POLICY_V13)) {
    throw new Error('IMPACT_ALLOCATION_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialImpactAllocationStateV13(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_IMPACT_ALLOCATION_POLICY_V13)) {
    throw new Error('IMPACT_ALLOCATION_POLICY_REQUIRED');
  }
  if (hasOfficialImpactAllocationPolicyV13(state)) return state;
  return { ...state, officialImpactAllocationPolicy: { ...policy } };
}
