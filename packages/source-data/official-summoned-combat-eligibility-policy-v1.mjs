import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';

const recordKey = 'rules_sections:iuUyObNTQ2M8xK4IUqzC';
const clause = 'Only Engaged Units may be Activated during this Phase. Unengaged Units cannot act.';
const atomId = 'rule-atom:singleton:core-8-8-one-engaged-unit-activation:d057c060f544';
const contract = { schema: 'starcraft_tmg_summoned_combat_eligibility_policy_v1', version: '1.0.0',
  recordKey, sectionTitle: '8.8 PHASE 3: THE COMBAT PHASE', clause,
  combatEngagementRequired: true, ruleAtomId: atomId, trainingTruth: false };
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'policyHash'));

export function createOfficialSummonedCombatEligibilityPolicyV1({ context } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  const record = context.dataset.recordsByKey[recordKey];
  const section = record?.payload?.items?.find(item => item.title === contract.sectionTitle);
  const text = (section?.content || []).filter(row => row.type === 'text').map(row => row.value)
    .join(' ').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (!text.includes(clause)) throw Error('SUMMONED_COMBAT_ELIGIBILITY_SOURCE_UNSUPPORTED');
  const body = { ...contract, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
    sourceSnapshotHash: context.snapshot.snapshotHash, normalizedDatasetHash: context.dataset.datasetHash };
  return Object.freeze({ ...body, policyHash: hash(body) });
}

export function verifyOfficialSummonedCombatEligibilityPolicyV1(policy) {
  const fixed = Object.fromEntries(Object.keys(contract).map(key => [key, policy?.[key]]));
  if (!isDeepStrictEqual(fixed, contract)
    || !['sourceRecordHash', 'payloadHash', 'sourceSnapshotHash', 'normalizedDatasetHash']
      .every(key => /^[a-f0-9]{64}$/u.test(policy?.[key]))
    || policy.policyHash !== hash(withoutHash(policy))) throw Error('SUMMONED_COMBAT_ELIGIBILITY_POLICY_INVALID');
  return true;
}
