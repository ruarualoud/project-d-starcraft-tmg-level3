import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_PINPOINT_ENGAGEMENT_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_pinpoint_engagement_policy_v1', version: '1.0.0',
  ruleAtomId: 'rule-atom:pinpoint-engagement-status-override-v1',
  sourceRecordKey: 'rules_sections:FuahgilWtc8nccVSp2Vv',
  sourceRecordHash: '985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7',
  targetMustBeEngaged: true, attackerEngagementDoesNotRestrict: true,
  rangeLineOfSightAndTargetTagsStillRequired: true, trainingTruth: false,
});

export function hasOfficialPinpointEngagementPolicyV1(state) {
  if (state?.officialPinpointEngagementPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialPinpointEngagementPolicy, OFFICIAL_PINPOINT_ENGAGEMENT_POLICY_V1)) {
    throw Error('PINPOINT_ENGAGEMENT_POLICY_INVALID');
  }
  return true;
}

export function createOfficialPinpointEngagementPolicyV1({ context } = {}) {
  const policy = OFFICIAL_PINPOINT_ENGAGEMENT_POLICY_V1;
  if (context?.dataset?.recordsByKey?.[policy.sourceRecordKey]?.sourceRecordHash !== policy.sourceRecordHash) {
    throw Error('PINPOINT_ENGAGEMENT_SOURCE_MISMATCH');
  }
  return structuredClone(policy);
}
