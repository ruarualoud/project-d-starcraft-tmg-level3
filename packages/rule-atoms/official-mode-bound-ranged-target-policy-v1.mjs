import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_mode_bound_ranged_target_policy_v1', version: '1.0.0',
  ruleAtomId: 'rule-atom:mode-bound-engaged-ranged-target-prohibition-v1',
  sourceEffectKind: 'ranged_engaged_target_prohibition', requiredModeStatus: 'siege_mode',
  selectedTargetCannotBeEngagedWithSource: true, templateCollateralRemainsSeparate: true,
  trainingTruth: false,
});

export function hasOfficialModeBoundRangedTargetPolicyV1(state) {
  const source = state.officialCharacteristicStatusFamilySourceBundle;
  const routes = source?.routes?.filter(row => row.effectKind === OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1.sourceEffectKind) || [];
  const policy = state.officialModeBoundRangedTargetPolicy;
  if (policy === undefined && !routes.length) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1)
    || source?.schema !== 'starcraft_tmg_official_characteristic_status_family_source_bundle_v2'
    || !routes.length || routes.some(row => row.requiresModeStatus !== policy.requiredModeStatus)) {
    throw Error('MODE_BOUND_RANGED_TARGET_POLICY_SOURCE_MISMATCH');
  }
  return true;
}
