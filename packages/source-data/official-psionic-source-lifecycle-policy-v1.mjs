import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';

export function createOfficialPsionicSourceLifecyclePolicyV1({ context, includeDeepTunnel = false }) {
  assertOfficialReleaseSourceV2(context, context || {});
  const recordKey = 'rules_sections:cB7X7UfOMHh3Wxn79ASF';
  const record = context.dataset.recordsByKey[recordKey];
  const index = record?.payload?.items?.findIndex(row => row.title === '7.4 Destroyed Units');
  const raw = record?.payload?.items?.[index]?.content?.[0]?.value;
  const text = String(raw || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (!text.includes('When the last model falls, the Unit is Destroyed.')
    || !text.includes('Tokens created by the destroyed Unit are removed (unless they are STAY IN PLAY ).')) {
    throw Error('PSIONIC_SOURCE_DESTRUCTION_RULE_SOURCE_UNSUPPORTED');
  }
  const body = { schema: 'starcraft_tmg_psionic_source_lifecycle_policy_v1', version: includeDeepTunnel ? '1.1.0' : '1.0.0',
    normalizedDatasetHash: context.dataset.datasetHash, sourceSnapshotHash: context.snapshot.snapshotHash,
    source: { recordKey, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      jsonPointer: '/items/' + index + '/content/0/value', textHash: hash(raw) },
    ruleAtomIds: ['rule-atom:singleton:core-7-4-unit-destroyed:e866879bfd22',
      'rule-atom:singleton:core-7-4-destroyed-unit-tokens:4a40d486b4c8'],
    consumerScope: includeDeepTunnel ? 'source_owned_shade_and_burrow_tokens_and_bound_round_end_effects'
      : 'source_owned_shade_tokens_and_bound_round_end_effects',
    removeOnUnitDestruction: true, preserveStayInPlay: true, trainingTruth: false };
  return Object.freeze({ ...body, policyHash: hash(body) });
}
