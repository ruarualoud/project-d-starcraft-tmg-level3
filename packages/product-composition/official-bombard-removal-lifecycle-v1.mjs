import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { createOfficialCleanupContinuationPolicyV1 } from './official-cleanup-continuation-runtime-v1.mjs';
import { createOfficialBombardTargetingPolicyV1 } from './official-bombard-targeting-v1.mjs';

export function createOfficialBombardRemovalLifecyclePolicyV1({ context, source }) {
  assertOfficialReleaseSourceV2(context, context || {});
  createOfficialBombardTargetingPolicyV1({ source });
  const cleanup = createOfficialCleanupContinuationPolicyV1({ context });
  const record = context.dataset.recordsByKey['rules_sections:cB7X7UfOMHh3Wxn79ASF'];
  const index = record?.payload.items.findIndex(row => row.title === '7.4 Destroyed Units');
  const raw = record?.payload.items[index]?.content?.[0]?.value;
  const text = String(raw || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (!text.includes('Tokens created by the destroyed Unit are removed (unless they are STAY IN PLAY ).')) {
    throw Error('BOMBARD_SOURCE_DESTRUCTION_RULE_MISSING');
  }
  const body = { schema: 'starcraft_tmg_bombard_removal_lifecycle_policy_v1', version: '1.0.0',
    sourceBundleHash: source.bundleHash, sourceSnapshotHash: context.snapshot.snapshotHash,
    normalizedDatasetHash: context.dataset.datasetHash, cleanupPolicyHash: cleanup.policyHash,
    destructionSource: { recordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash, pointer: '/payload/items/' + index + '/content/0/value', textHash: hash(raw) },
    ruleAtomIds: ['rule-atom:bombard-before-token-removal-creep-v1',
      'rule-atom:singleton:core-7-4-destroyed-unit-tokens:4a40d486b4c8'],
    cleanupBeforeRefresh: true, destroyedSourceBeforeTokenRemoval: true, preserveStayInPlay: true,
    trainingTruth: false };
  return { ...body, policyHash: hash(body) };
}
