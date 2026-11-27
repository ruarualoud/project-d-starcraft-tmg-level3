import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_template_batch_order_policy_v1',
  version: '1.0.0', faqVersion: '1.3', sourceEntryId: 'faq-v1.3:39',
  sourceByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  effectiveAnswerHash: '7e23d673e089b6be7b6c7a75a471225dec9a19b2d4a2fc334dee78e5c7bcfb01',
  batchOrderOwner: 'attacking_controller',
  mainTargetClassificationIndependentOfOrder: true,
  ruleAtomId: 'rule-atom:faq-v1.3-template-controller-batch-order',
});

export const OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13 = Object.freeze({
  ...OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13,
  version: '1.1.0', nextBatchSelection: 'controller_after_previous_batch_settles',
});

export function hasOfficialTemplateBatchOrderPolicyV13(state) {
  const policy = state?.officialTemplateBatchOrderPolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13)
    && !isDeepStrictEqual(policy, OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13)) {
    throw Error('TEMPLATE_BATCH_ORDER_POLICY_MISMATCH');
  }
  return true;
}

export function allowsOfficialTemplateAdaptiveBatchOrderV13(state) {
  return hasOfficialTemplateBatchOrderPolicyV13(state)
    && state.officialTemplateBatchOrderPolicy.version === '1.1.0';
}

export function selectOfficialTemplateNextBatchV13({ state, batches, completedCount, unitId }) {
  if (!allowsOfficialTemplateAdaptiveBatchOrderV13(state)) throw Error('TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_REQUIRED');
  if (!Array.isArray(batches) || !Number.isSafeInteger(completedCount) || completedCount < 0 || completedCount >= batches.length) {
    throw Error('TEMPLATE_BATCH_CURSOR_INVALID');
  }
  const selectedIndex = batches.findIndex(batch => batch.unitId === unitId);
  if (selectedIndex < completedCount) throw Error('TEMPLATE_NEXT_UNRESOLVED_BATCH_REQUIRED');
  return [...batches.slice(0, completedCount), batches[selectedIndex],
    ...batches.slice(completedCount).filter(batch => batch.unitId !== unitId)].map(batch => structuredClone(batch));
}

export function resolveOfficialTemplateBatchOrderV13({ state, batches, batchOrderUnitIds }) {
  if (!hasOfficialTemplateBatchOrderPolicyV13(state)) throw Error('TEMPLATE_BATCH_ORDER_POLICY_REQUIRED');
  if (!Array.isArray(batches) || !batches.length
    || batches.some(batch => typeof batch.unitId !== 'string' || !batch.unitId)
    || new Set(batches.map(batch => batch.unitId)).size !== batches.length) {
    throw Error('TEMPLATE_BATCH_ORDER_SOURCE_INVALID');
  }
  if (batchOrderUnitIds === undefined) return structuredClone(batches);
  if (!Array.isArray(batchOrderUnitIds) || batchOrderUnitIds.length !== batches.length
    || new Set(batchOrderUnitIds).size !== batches.length
    || batchOrderUnitIds.some(id => !batches.some(batch => batch.unitId === id))) {
    throw Error('TEMPLATE_BATCH_ORDER_PERMUTATION_REQUIRED');
  }
  return batchOrderUnitIds.map(id => structuredClone(batches.find(batch => batch.unitId === id)));
}
