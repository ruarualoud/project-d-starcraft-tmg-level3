import { isDeepStrictEqual } from 'node:util';
import { canOfficialUnitBeAbilityTargetV1 } from './official-decoy-rules-v1.mjs';

export const OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_structure_targeting_policy_v1',
  version: '1.0.0',
  sourceFaqByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  entryId: 'faq-v1.3:56',
  scope: 'explicit_unit_effect_recipients',
  ruleAtomId: 'rule-atom:faq-v1.3-structure-area-target',
});

export function hasOfficialStructureTargetingPolicyV13(state) {
  const policy = state?.officialStructureTargetingPolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_STRUCTURE_TARGETING_POLICY_V13)) {
    throw new Error('STRUCTURE_TARGETING_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialStructureTargetingStateV13(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_STRUCTURE_TARGETING_POLICY_V13)) {
    throw new Error('STRUCTURE_TARGETING_POLICY_REQUIRED');
  }
  if (hasOfficialStructureTargetingPolicyV13(state)) return state;
  return { ...state, officialStructureTargetingPolicy: { ...policy } };
}

// Call only for the actual Unit recipient of a Special Ability. Area effects,
// untargeted Hits and measurement references keep their own Native consumers.
export function allowsOfficialAbilityUnitRecipientV13(state, piece) {
  return canOfficialUnitBeAbilityTargetV1(state, piece)
    && (!hasOfficialStructureTargetingPolicyV13(state) || piece?.isStructure !== true);
}
