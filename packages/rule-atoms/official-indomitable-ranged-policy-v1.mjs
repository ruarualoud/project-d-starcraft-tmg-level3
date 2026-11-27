import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_INDOMITABLE_RANGED_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_indomitable_ranged_engagement_policy_v1',
  version: '1.0.0',
  ruleAtomId: 'rule-atom:indomitable-ranged-target-and-evade-v1',
  sourceEffectKind: 'indomitable',
  requiresSourceUnitEngaged: true,
  requiresOtherUnitUnengaged: true,
  defenderGainsEvadeEligibility: true,
  nullEvadeRemainsProhibited: true,
  trainingTruth: false,
});

export const OFFICIAL_INDOMITABLE_RANGED_POLICY_V2 = Object.freeze({
  ...OFFICIAL_INDOMITABLE_RANGED_POLICY_V1, version: '1.1.0', templateBatchDefenderEvade: true,
});

export function hasOfficialIndomitableRangedPolicyV1(state) {
  if (state.officialIndomitableRangedPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialIndomitableRangedPolicy, OFFICIAL_INDOMITABLE_RANGED_POLICY_V1)
    && !isDeepStrictEqual(state.officialIndomitableRangedPolicy, OFFICIAL_INDOMITABLE_RANGED_POLICY_V2)) {
    throw Error('INDOMITABLE_RANGED_POLICY_INVALID');
  }
  const source = state.officialCharacteristicStatusFamilySourceBundle;
  if (source?.schema !== 'starcraft_tmg_official_characteristic_status_family_source_bundle_v2'
    || !source.routes?.some(row => row.effectKind === 'indomitable')) {
    throw Error('INDOMITABLE_RANGED_SOURCE_REQUIRED');
  }
  return true;
}

export function hasOfficialIndomitableTemplateBatchPolicyV1(state) {
  return hasOfficialIndomitableRangedPolicyV1(state)
    && state.officialIndomitableRangedPolicy.templateBatchDefenderEvade === true;
}
