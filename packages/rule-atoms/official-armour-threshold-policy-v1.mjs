import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_planned_armour_threshold_policy_v1',
  version: '1.0.0',
  ruleAtomId: 'rule-atom:source-planned-armour-threshold-v1',
  planningAndResolutionUseSameThreshold: true,
  naturalOneFails: true,
  naturalSixSucceeds: true,
  trainingTruth: false,
});

export function hasOfficialArmourThresholdPolicyV1(state) {
  if (state.officialArmourThresholdPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialArmourThresholdPolicy, OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1)) {
    throw Error('ARMOUR_THRESHOLD_POLICY_INVALID');
  }
  return true;
}

export function planOfficialArmourThresholdV1(state, printedThreshold, modifier = 0) {
  const threshold = Math.max(2, Number(printedThreshold) - Number(modifier));
  if (!hasOfficialArmourThresholdPolicyV1(state)) return threshold;
  if (!Number.isSafeInteger(threshold)) throw Error('ARMOUR_THRESHOLD_INPUT_INVALID');
  // Natural six succeeds even if a Debuff raises the nominal target above six.
  return Math.min(6, threshold);
}

export function consumeOfficialArmourThresholdV1(state, plannedThreshold, legacyPrintedThreshold) {
  if (!hasOfficialArmourThresholdPolicyV1(state)) return legacyPrintedThreshold;
  if (!Number.isSafeInteger(plannedThreshold) || plannedThreshold < 2 || plannedThreshold > 6) {
    throw Error('ARMOUR_THRESHOLD_PLAN_INVALID');
  }
  return plannedThreshold;
}
