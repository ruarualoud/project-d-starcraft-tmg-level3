import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { describeInitiativeRollOffChanceV1 } from '../rule-atoms/initiative-roll-off-kernel-v1.mjs';
import { missionActivationPrecedesPriorityV13 } from '../rule-atoms/official-mission-round-start-policy-v13.mjs';
import { completeOfficialCurrentProductCleanupStateV1, resolveOfficialCurrentProductInitiativeV1 } from './official-match-cleanup-successor-v1.mjs';

const parentKey = 'pendingOfficialCharacteristicCleanup';
const cleanupType = 'resolve_current_product_cleanup_refresh';
const initiativeType = 'resolve_current_product_next_round_initiative';
const runtimeId = 'official-characteristic-cleanup-continuation-v1';
const ruleAtomIds = ['rule-atom:current-product-match-cleanup-refresh-v1', 'rule-atom:current-product-match-next-round-initiative-v1'];
const clone = value => structuredClone(value);
const without = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
const seal = (value, field) => ({ ...value, [field]: hash(value) });
const fail = code => { throw Error(code); };

export function createOfficialCleanupContinuationPolicyV1({ context } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  const sections = [
    ['rules_sections:iuUyObNTQ2M8xK4IUqzC', '8.9 PHASE 4: THE SCORING & CLEANUP PHASE', '8.9.5 Cleanup & Refresh'],
    ['rules_sections:H3Fn8YSvEvpJZpT57qw1', '10.1 Special Abilities'],
    ['rules_sections:H3Fn8YSvEvpJZpT57qw1', '10.4 Reaction Abilities (Full Rules)'],
  ].map(([recordKey, title, subTitle]) => {
    const record = context.dataset.recordsByKey[recordKey];
    const entry = record?.payload.items.find(row => row.title === title);
    const selected = subTitle ? entry?.subItems.find(row => row.title === subTitle) : entry;
    const text = selected?.content?.filter(row => row.type === 'text').map(row => row.value).join('\n');
    if (!text) fail('CLEANUP_CONTINUATION_SOURCE_MISSING');
    return { recordKey, title: subTitle || title, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash, textHash: hash(text) };
  });
  return seal({ schema: 'starcraft_tmg_cleanup_continuation_policy_v1', version: '1.0.0',
    sourceSnapshotHash: context.snapshot.snapshotHash, normalizedDatasetHash: context.dataset.datasetHash, sections,
    expireBeforeReactionsBeforeRefresh: true, finishCurrentRoundEffectsBeforeRefresh: true,
    matchSuccessorShared: true, ruleAtomIds, trainingTruth: false }, 'policyHash');
}

export function createOfficialCleanupContinuationRuntimeV1({ context, policy, expire, finalizeEffects, refresh, hasPendingReaction }) {
  if (!isDeepStrictEqual(policy, createOfficialCleanupContinuationPolicyV1({ context }))
    || [expire, finalizeEffects, refresh, hasPendingReaction].some(fn => typeof fn !== 'function')) fail('CLEANUP_CONTINUATION_BINDING_INVALID');
  function pending(state) {
    const parent = state[parentKey];
    if (!parent) {
      if (state.currentProductMatchLifecycle?.step === 'cleanup_reactions') fail('CLEANUP_CONTINUATION_PARENT_MISSING');
      return null;
    }
    if (parent.schema !== 'starcraft_tmg_cleanup_continuation_parent_v1'
      || parent.parentHash !== hash(without(parent, 'parentHash')) || parent.policyHash !== policy.policyHash
      || parent.round !== Number(state.round) || parent.phase !== state.phase || state.phase !== 'cleanup'
      || state.currentProductMatchLifecycle?.step !== 'cleanup_reactions'
      || !/^[a-f0-9]{64}$/.test(parent.sourceStateHash) || parent.refreshPending !== true) fail('CLEANUP_CONTINUATION_PARENT_INVALID');
    return parent;
  }
  function candidates(state, options = {}) {
    if (pending(state) || state.phase !== 'cleanup' || state.gameOver || state.terminal
      || options.sideKey && options.sideKey !== state.firstPlayerSideKey) return [];
    const step = state.currentProductMatchLifecycle?.step;
    const actionType = step === 'cleanup_and_refresh' ? cleanupType
      : step === 'determine_initiative' && !missionActivationPrecedesPriorityV13(state) ? initiativeType : null;
    if (!actionType) return [];
    if (state.pendingOfficialReactionWindow || state.pendingAction || state.pendingPsionicTransferRoundEnd
      || (state.pendingBattlefieldAssetOpportunities || []).some(row => row.optional === true && row.expiresAt === 'cleanup_and_refresh')) {
      fail('CLEANUP_CONTINUATION_OTHER_PARENT_PENDING');
    }
    const chance = actionType === initiativeType && Number(state.scores.player1) === Number(state.scores.player2)
      ? describeInitiativeRollOffChanceV1() : null;
    return [seal({ actionType, sideKey: state.firstPlayerSideKey, phase: 'cleanup',
      preStateHash: hash(state), policyHash: policy.policyHash,
      executorId: runtimeId, executorVersion: '1.0.0', ruleAtomIds,
      ...(chance ? { chance } : {}), trainingTruth: false }, 'actionHash')];
  }
  function apply(state, action, options = {}) {
    const expected = candidates(state).find(row => row.actionType === action.actionType);
    if (!expected || !isDeepStrictEqual(expected, action)) fail('CLEANUP_CONTINUATION_ACTION_STALE');
    if (action.actionType === initiativeType) {
      return { ok: true, ...resolveOfficialCurrentProductInitiativeV1(state, action, options),
        action, settlementRequired: false }; 
    }
    const transition = expire(state);
    const next = clone(transition.state);
    next[parentKey] = seal({ schema: 'starcraft_tmg_cleanup_continuation_parent_v1', policyHash: policy.policyHash,
      sourceStateHash: hash(state), round: Number(state.round), phase: 'cleanup', refreshPending: true,
      firstPlayerSideKey: state.firstPlayerSideKey, sourceActionHash: hash(action), trainingTruth: false }, 'parentHash');
    next.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1', round: Number(next.round),
      step: 'cleanup_reactions', trainingTruth: false };
    return { ...transition, state: next };
  }
  function afterTransition(result) {
    const parent = pending(result.state);
    if (!parent || hasPendingReaction(result.state)) return result;
    const refreshed = finalizeEffects(result.state);
    const next = completeOfficialCurrentProductCleanupStateV1(refreshed);
    delete next[parentKey];
    const event = { type: 'characteristic_cleanup_completed', round: parent.round,
      cleanupParentHash: parent.parentHash, sourceActionHash: parent.sourceActionHash,
      sourceRefreshAfterReactions: true, nextStep: next.currentProductMatchLifecycle.step, trainingTruth: false };
    next.officialCleanupContinuationHistory = [...(next.officialCleanupContinuationHistory || []), event];
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round), phase: next.phase,
      action: { actionType: cleanupType }, events: [event] }];
    return { ...result, state: refresh(next), events: [...result.events, event] };
  }
  function query(state, request) {
    if (Object.keys(request).join(',') !== 'queryKind' || request.queryKind !== 'cleanup_continuation_status') fail('CLEANUP_CONTINUATION_QUERY_INVALID');
    const parent = pending(state);
    return seal({ schema: 'starcraft_tmg_cleanup_continuation_query_v1', stateHash: hash(state),
      result: { pending: parent, round: Number(state.round), phase: state.phase,
        matchLifecycle: clone(state.currentProductMatchLifecycle || null),
        completed: clone(state.officialCleanupContinuationHistory || []),
        sourceRefreshPending: Boolean(parent) }, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }
  return { pending, candidates, apply, afterTransition, query, descriptor: {
    runtimeId, runtimeVersion: '1.0.0', policyHash: policy.policyHash, ruleAtomIds,
    actions: [cleanupType, initiativeType], persistentReactionParent: true, matchSuccessorShared: true, trainingTruth: false } };
}
