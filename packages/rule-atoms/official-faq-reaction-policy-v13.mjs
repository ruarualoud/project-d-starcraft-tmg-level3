import { isDeepStrictEqual } from 'node:util';

// Explicit candidate component. Adding other FAQ consumers requires their own
// source-backed implementation and Room evidence before extending coverage.
export const OFFICIAL_FAQ_REACTION_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_faq_reaction_policy_v1',
  version: '1.0.0',
  faqVersion: '1.3',
  sourceByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  outsideActivationLimit: 'one_per_player_round_phase',
  outsideActivationPriority: 'first_player_marker_holder',
  insideActivationLimit: 'one_per_player_activation',
  namedAbilityLimit: 'once_per_source_round_unless_repeatable',
  ruleAtomId: 'rule-atom:faq-v1.3-outside-activation-per-phase',
});

export function hasOfficialFaqReactionPolicyV13(state) {
  const policy = state?.officialFaqReactionPolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_FAQ_REACTION_POLICY_V13)) {
    throw new Error('FAQ_REACTION_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialFaqReactionStateV13(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_FAQ_REACTION_POLICY_V13)) {
    throw new Error('FAQ_REACTION_POLICY_REQUIRED');
  }
  if (hasOfficialFaqReactionPolicyV13(state)) return state;
  return { ...state, officialFaqReactionPolicy: { ...policy } };
}
