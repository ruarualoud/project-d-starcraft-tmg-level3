import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_high_ground_final_placement_policy_v1',
  version: '1.0.0',
  sourceFaqByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  sourceCoreByteHash: '27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54',
  highGroundCentreRequiredAtFinalPosition: true,
  crossElevationTopDownBaseOverlapAllowed: false,
  pathSupportUsesFinalPositionException: false,
  ruleAtomId: 'rule-atom:faq-v1-12-wobbly-supported-center',
});

export function hasOfficialHighGroundFinalPlacementPolicyV13(state) {
  const policy = state?.officialHighGroundFinalPlacementPolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13)) {
    throw new Error('HIGH_GROUND_FINAL_PLACEMENT_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialHighGroundFinalPlacementStateV13(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13)) {
    throw new Error('HIGH_GROUND_FINAL_PLACEMENT_POLICY_REQUIRED');
  }
  if (hasOfficialHighGroundFinalPlacementPolicyV13(state)) return state;
  return { ...state, officialHighGroundFinalPlacementPolicy: structuredClone(policy) };
}
