import { verifySeal, fail } from '../skill-production/common.mjs';
import { factionNativeProductionKindV1,
  prepareFactionNativeProductionRoleV1,
  usesFactionNativeProductionInputV1 } from './faction-native-production-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2,
  usesFactionNativeOutputCapacityV2 } from './faction-native-output-capacity-v2.mjs';
import { recoverFactionOutlineCapacityV1 } from './faction-outline-capacity-recovery-v1.mjs';
import { validateFactionOutlineCapacityBindingV1 } from './faction-outline-capacity-envelope-v1.mjs';

export function usesFactionNativeProductionInputV2(artifact) {
  return usesFactionNativeProductionInputV1(artifact)
    || artifact?.protocol === 'faction_outline_narrative_capacity_v1';
}

export async function routeFactionOutlineCapacityEvidenceV1({ evidence, dry,
  runtime, request, prepared, readCurrentFailure }) {
  if (evidence) return { delegated: false, evidence };
  if (dry || typeof readCurrentFailure !== 'function') {
    return { delegated: true, value: await runtime.role(request) };
  }
  try {
    return { delegated: true, value: await runtime.role(request) };
  } catch (error) {
    if (error.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID') throw error;
    const failureReceiptHash = error.safeReceipt?.receiptHash;
    const current = readCurrentFailure({ prepared, failureReceiptHash });
    const actualReceiptHash = current?.rejected?.safeReceiptHash;
    if (!/^[a-f0-9]{64}$/u.test(actualReceiptHash || '')
      || failureReceiptHash && actualReceiptHash !== failureReceiptHash
      || current.rejected.roleRef?.id !== prepared.fullRoleId
      || current.rejected.roleRef?.hash !== prepared.roleRef.hash
      || current.rejected.contextManifestRef?.hash
        !== prepared.contextManifestRef.hash) {
      fail('FACTION_OUTLINE_CAPACITY_CURRENT_EVIDENCE_INVALID');
    }
    return { delegated: false, evidence: current };
  }
}

export function withFactionOutlineCapacityRecoveryV1(options) {
  const { input, runtime, store, dsh, binding, imports = [],
    baseExecutionPolicy, outputCapacityBinding, frozenRoleIds,
    proposerBatchBinding, proposerAuxiliaryCapacityBinding,
    targetReconstructionBinding, readCurrentFailure = null,
    dry = false, onProgress = () => {} } = options;
  validateFactionOutlineCapacityBindingV1(binding);
  if (!outputCapacityBinding || !Array.isArray(frozenRoleIds))
    fail('FACTION_OUTLINE_CAPACITY_NATIVE_ROUTE_REQUIRED');
  return Object.freeze({ async role(request) {
    const fullRoleId = request.packet.id + '.' + request.roleId;
    const kind = factionNativeProductionKindV1(request.roleId,
      { targetReconstructionBinding });
    const capacitySelected = usesFactionNativeOutputCapacityV2({
      roleId: fullRoleId, kind, binding: outputCapacityBinding, frozenRoleIds,
    });
    if (kind !== 'outline' || !capacitySelected) return runtime.role(request);
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
    const importedEvidence = imports.find(row =>
      row.rejected?.roleRef?.id === prepared.fullRoleId);
    const routed = await routeFactionOutlineCapacityEvidenceV1({
      evidence: importedEvidence, dry, runtime, request, prepared,
      readCurrentFailure,
    });
    if (routed.delegated) return routed.value;
    const evidence = routed.evidence;
    const lease = store.acquire(fullRoleId, prepared.roleInput);
    if (lease.cached) return verifySeal(lease.artifact);
    if (dry) {
      // An authenticated import is itself the first route under test; no
      // credential or Provider call is necessary in preflight.
      const recovered = await recoverFactionOutlineCapacityV1({ input,
        request: effectiveRequest, prepared, evidence, binding, dsh });
      onProgress({ stage: 'outline_capacity_recovered', role: request.roleId,
        providerCalls: 0, dry: true,
        focusLengths: recovered.hostMaterialization.normalized.focusLengths });
      return store.finish(lease, recovered);
    }
    const recovered = await recoverFactionOutlineCapacityV1({ input,
      request: effectiveRequest, prepared, evidence, binding, dsh });
    onProgress({ stage: 'outline_capacity_recovered', role: request.roleId,
      providerCalls: 0,
      focusLengths: recovered.hostMaterialization.normalized.focusLengths,
      freshSourceAndSemanticReviewRequired: true });
    return store.finish(lease, recovered);
  } });
}
