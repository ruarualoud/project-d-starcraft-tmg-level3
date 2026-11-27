import { isDeepStrictEqual } from 'node:util';
import { isOfficialAbilityModelPresenceV13 } from './official-ability-reference-policy-v13.mjs';

export const OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_relocation_geometry_policy_v1',
  version: '1.0.0',
  sourceFaqByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  sourceCoreByteHash: '27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54',
  physicalPathIncludesStructures: true,
  rapidReinforcementsStructureOriginAllowed: false,
  ruleAtomId: 'rule-atom:faq-v1.3-rapid-reinforcement-source-exclusion',
});

export function hasOfficialRelocationGeometryPolicyV13(state) {
  const policy = state?.officialRelocationGeometryPolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13)) {
    throw new Error('RELOCATION_GEOMETRY_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialRelocationGeometryStateV13(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13)) {
    throw new Error('RELOCATION_GEOMETRY_POLICY_REQUIRED');
  }
  if (hasOfficialRelocationGeometryPolicyV13(state)) return state;
  return { ...state, officialRelocationGeometryPolicy: structuredClone(policy) };
}

export function isOfficialRelocationPlacementOriginV13(route, piece) {
  if (!isOfficialAbilityModelPresenceV13(piece)) return false;
  // FAQ59 is an explicit restriction on this particular placement origin.
  // Griffin Support has a different source rule and retains physical presences.
  if (route.recordKey === 'army_units:raynor_s_raider__marine_'
    && route.abilityName === 'Rapid Reinforcements') return piece.isStructure !== true;
  return true;
}
