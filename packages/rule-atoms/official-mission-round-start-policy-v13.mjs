import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_MISSION_MARKER_ROLL_ACTION_V1 = 'resolve_current_product_mission_marker_activation';
export const OFFICIAL_MISSION_ROUND_START_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_mission_round_start_policy_v1',
  version: '1.0.0',
  sourceFaqByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  entryId: 'faq-v1.3:22',
  missionFamily: 'supply_drop',
  order: 'marker_activation_then_priority',
  randomSelection: 'uniform_rejection_from_native_d6',
  ruleAtomId: 'rule-atom:faq-v1.3-supply-drop-before-priority',
});

export function hasOfficialMissionRoundStartPolicyV13(state) {
  const policy = state?.officialMissionRoundStartPolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_MISSION_ROUND_START_POLICY_V13)) {
    throw new Error('MISSION_ROUND_START_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialMissionRoundStartStateV13(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_MISSION_ROUND_START_POLICY_V13)) {
    throw new Error('MISSION_ROUND_START_POLICY_REQUIRED');
  }
  if (hasOfficialMissionRoundStartPolicyV13(state)) return state;
  return { ...state, officialMissionRoundStartPolicy: { ...policy } };
}

export function missionActivationPrecedesPriorityV13(state) {
  return hasOfficialMissionRoundStartPolicyV13(state)
    && state.officialMissionRuntimeState?.missionFamily === 'supply_drop';
}

export function describeOfficialMissionMarkerChanceV1(rangeSize) {
  if (!Number.isSafeInteger(rangeSize) || rangeSize < 1) throw new Error('MISSION_MARKER_RANGE_INVALID');
  let count = 1;
  let space = 6;
  while (space < rangeSize) { space *= 6; count += 1; }
  return { kind: 'fixed_roll_sequence', faces: 6, count,
    layout: { testInitial: 0, testReroll: 0, generatedValue: count, invalidDieReroll: 0 } };
}

export function resolveOfficialMissionMarkerChanceV1(rangeSize, chanceReveals) {
  const chance = describeOfficialMissionMarkerChanceV1(rangeSize);
  if (!Array.isArray(chanceReveals) || chanceReveals.length !== chance.count
    || chanceReveals.some(reveal => !Number.isSafeInteger(reveal.outcome) || reveal.outcome < 1 || reveal.outcome > 6)) {
    throw new Error('MISSION_MARKER_NATIVE_DICE_INVALID');
  }
  const value = chanceReveals.reduce((result, reveal) => result * 6 + reveal.outcome - 1, 0);
  const space = 6 ** chance.count;
  const accepted = value < space - space % rangeSize;
  return { accepted, outcomeIndex: accepted ? value % rangeSize : null, rangeSize };
}
