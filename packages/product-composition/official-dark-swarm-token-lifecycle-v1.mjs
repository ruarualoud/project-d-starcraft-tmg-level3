import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { projectOfficialDestroyedSourceTokenIdsV1 }
  from '../rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import { createOfficialCleanupContinuationPolicyV1 } from './official-cleanup-continuation-runtime-v1.mjs';
import { consumeOfficialBattlefieldTokenAssetCleanupV1 } from './official-battlefield-asset-family-adapter-v1.mjs';
import { inspectOfficialDarkSwarmPlacementBindingsV1, OFFICIAL_GESTATE_DARK_SWARM_DEFINITION_ID }
  from './official-dark-swarm-placement-v1.mjs';

const seal = (body, field) => ({ ...body, [field]: hash(body) });
const without = (body, field) => Object.fromEntries(Object.entries(body).filter(([key]) => key !== field));

export function createOfficialDarkSwarmTokenLifecyclePolicyV1({ context, source }) {
  if (source?.definitionId !== OFFICIAL_GESTATE_DARK_SWARM_DEFINITION_ID
    || source.bundleHash !== hash(without(source, 'bundleHash'))) throw Error('DARK_SWARM_LIFECYCLE_SOURCE_REQUIRED');
  const cleanup = createOfficialCleanupContinuationPolicyV1({ context });
  const record = context.dataset.recordsByKey['rules_sections:cB7X7UfOMHh3Wxn79ASF'];
  const index = record?.payload.items.findIndex(row => row.title === '7.4 Destroyed Units');
  const raw = record?.payload.items[index]?.content?.[0]?.value;
  const text = String(raw || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (!text.includes('Tokens created by the destroyed Unit are removed (unless they are STAY IN PLAY ).')) {
    throw Error('DARK_SWARM_DESTRUCTION_RULE_MISSING');
  }
  return seal({ schema: 'starcraft_tmg_dark_swarm_token_lifecycle_policy_v1', version: '1.0.0',
    sourceBundleHash: source.bundleHash, sourceSnapshotHash: context.snapshot.snapshotHash,
    normalizedDatasetHash: context.dataset.datasetHash, cleanupPolicyHash: cleanup.policyHash,
    destructionSource: { recordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash, pointer: '/payload/items/' + index + '/content/0/value', textHash: hash(raw) },
    ruleAtomIds: ['rule-atom:current-product-match-cleanup-refresh-v1',
      'rule-atom:singleton:core-7-4-destroyed-unit-tokens:4a40d486b4c8'],
    trainingTruth: false }, 'policyHash');
}

export function createOfficialDarkSwarmTokenLifecycleV1({ context, state, source }) {
  const policy = createOfficialDarkSwarmTokenLifecyclePolicyV1({ context, source });
  if (!isDeepStrictEqual(policy, state.officialDarkSwarmTokenLifecyclePolicy)) {
    throw Error('DARK_SWARM_TOKEN_LIFECYCLE_POLICY_MISMATCH');
  }
  function cleanup(current) {
    inspectOfficialDarkSwarmPlacementBindingsV1(current);
    const result = consumeOfficialBattlefieldTokenAssetCleanupV1(current);
    result.state.officialDarkSwarmCleanupHistory = [...(result.state.officialDarkSwarmCleanupHistory || []), {
      round: Number(current.round), policyHash: policy.policyHash, cleanupHash: result.cleanup.cleanupHash,
      removedTokenIds: result.cleanup.removedTokenIds, retainedTokenIds: result.cleanup.retainedTokenIds, trainingTruth: false }];
    return result.state;
  }
  function afterTransition(result, before) {
    const current = result.state;
    const destroyed = (current.officialBattlefieldAssetBindings || []).filter(binding => !binding.consumed
      && binding.sourceDefinitionId === source.definitionId).filter(binding => {
      const actor = current.pieces.find(piece => piece.id === binding.sourcePieceId);
      return actor?.isDestroyed === true && Number(actor.currentModels) === 0;
    });
    if (!destroyed.length) {
      inspectOfficialDarkSwarmPlacementBindingsV1(current);
      return result;
    }
    // A combat consumer may already have removed the token. Only its verified
    // pre-transition original can attest that removal, never a caller token.
    const originalRows = inspectOfficialDarkSwarmPlacementBindingsV1(before);
    const verificationState = structuredClone(current);
    for (const binding of destroyed) {
      if (verificationState.board.tokens.some(token => token.tokenId === binding.assetId)) continue;
      const original = originalRows.find(row => row.binding.bindingHash === binding.bindingHash);
      if (!original) throw Error('DARK_SWARM_DESTROYED_TOKEN_ORIGINAL_REQUIRED');
      verificationState.board.tokens.push(structuredClone(original.token));
    }
    const verified = inspectOfficialDarkSwarmPlacementBindingsV1(verificationState);
    const removed = new Set(destroyed.flatMap(binding => {
      const token = verified.find(row => row.token.tokenId === binding.assetId)?.token;
      if (!token) throw Error('DARK_SWARM_DESTROYED_TOKEN_BINDING_REQUIRED');
      return projectOfficialDestroyedSourceTokenIdsV1([token], binding.sourcePieceId, 'tokenId').removeBoardTokenIds;
    }));
    const next = structuredClone(current);
    next.board.tokens = next.board.tokens.filter(token => !removed.has(token.tokenId));
    next.officialBattlefieldAssetBindings = next.officialBattlefieldAssetBindings.map(binding => {
      if (!removed.has(binding.assetId)) return binding;
      return seal({ ...without(binding, 'bindingHash'), consumed: true, previousBindingHash: binding.bindingHash,
        removalCause: 'source_destroyed' }, 'bindingHash');
    });
    const event = { type: 'dark_swarm_destroyed_source_tokens_removed', tokenIds: [...removed].sort(),
      policyHash: policy.policyHash, trainingTruth: false };
    next.officialDarkSwarmRemovalHistory = [...(next.officialDarkSwarmRemovalHistory || []), {
      round: Number(next.round), ...event }];
    if (next.log?.length) next.log.at(-1).events = [...(next.log.at(-1).events || []), event];
    return { ...result, state: next, events: [...(result.events || []), event] };
  }
  return Object.freeze({ cleanup, afterTransition, descriptor: { policyHash: policy.policyHash,
    ruleAtomIds: policy.ruleAtomIds, cleanupBeforeRefresh: true, sourceDestructionConsumerReady: true,
    preservesVerifiedMissingTokenOriginal: true, trainingTruth: false } });
}
