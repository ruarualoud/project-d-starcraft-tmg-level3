import { verifySeal, fail } from '../skill-production/common.mjs';
import { factionNativeProductionKindV1,
  prepareFactionNativeProductionRoleV1 } from
  './faction-native-production-runtime-v1.mjs';
import { usesFactionNativeProductionInputV2 } from
  './faction-outline-capacity-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2,
  usesFactionNativeOutputCapacityV2 } from
  './faction-native-output-capacity-v2.mjs';
import { recoverFactionNativeItemsEnvelopeV1,
  validateFactionNativeItemsEnvelopeBindingV1 } from
  './faction-native-items-envelope-recovery-v1.mjs';

export function usesFactionNativeProductionInputV3(artifact) {
  return usesFactionNativeProductionInputV2(artifact)
    || artifact?.protocol === 'faction_native_items_envelope_recovery_v1';
}

export function withFactionNativeItemsEnvelopeRecoveryV1(options) {
  const { input, runtime, store, dsh, binding, imports = [],
    outputCapacityBinding, frozenRoleIds, proposerBatchBinding,
    proposerAuxiliaryCapacityBinding, targetReconstructionBinding,
    draftEnvelopeBinding, dry = false, onProgress = () => {} } = options;
  validateFactionNativeItemsEnvelopeBindingV1(binding);
  if (!outputCapacityBinding || !Array.isArray(frozenRoleIds)
    || !draftEnvelopeBinding) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_ROUTE_REQUIRED');
  }
  return Object.freeze({ async role(request) {
    const fullRoleId = request.packet.id + '.' + request.roleId;
    const kind = factionNativeProductionKindV1(request.roleId,
      { targetReconstructionBinding });
    const capacitySelected = usesFactionNativeOutputCapacityV2({
      roleId: fullRoleId, kind, binding: outputCapacityBinding, frozenRoleIds,
    });
    if (kind !== 'items' || !capacitySelected) return runtime.role(request);
    const effectiveRequest = applyFactionNativeOutputCapacityV2(request,
      outputCapacityBinding);
    const prepared = prepareFactionNativeProductionRoleV1({
      input,
      request: effectiveRequest,
      executionPolicy: outputCapacityBinding.executionPolicy,
      outputCapacityBinding,
      proposerBatchBinding,
      proposerAuxiliaryCapacityBinding,
      targetReconstructionBinding,
    });
    const evidence = imports.find(row =>
      row.rejected?.roleRef?.id === prepared.fullRoleId);
    if (!evidence) return runtime.role(request);
    const lease = store.acquire(fullRoleId, prepared.roleInput);
    if (lease.cached) return verifySeal(lease.artifact);
    const recovered = await recoverFactionNativeItemsEnvelopeV1({ input,
      request: effectiveRequest, prepared, evidence, binding,
      draftEnvelopeBinding, dsh });
    onProgress({ stage: 'native_items_envelope_recovered',
      role: request.roleId, providerCalls: 0, dry,
      movedItems: recovered.hostMaterialization.normalized.movedItems,
      fieldValuesChanged: false,
      freshWholeSectionReviewRequired: true });
    return store.finish(lease, recovered);
  } });
}
