import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { AUTHENTICATED_OPENING_FENCE_RECOVERY_BINDING_V1 as binding,
  verifyOpeningFenceRecoveryRecordV1, materializeOpeningFenceRecoveryV1 } from '../structured-generation/authenticated-opening-fence-recovery-v1.mjs';

export const FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1 = 'faction_fragment_authenticated_opening_fence_v1';
const invalid = () => fail('FACTION_FRAGMENT_OPENING_FENCE_BINDING_DRIFT');

// proofs are freshly authenticated by the entrypoint, not loaded as trusted
// candidate JSON. Runtime creation/reuse reauthenticates via authenticate().
// An independent consumer must populate its own authenticated proof set.
export function openingFenceForFactionFragmentV1({ prepared, recovery }) {
  if (!recovery) return null;
  if (verifySeal(recovery.binding).hash !== binding.hash || !Array.isArray(recovery.proofs)
    || typeof recovery.authenticate !== 'function') invalid();
  const matches = recovery.proofs.filter(p => p.contextManifestRef?.hash === prepared.capsule.hash);
  if (matches.length > 1) invalid();
  if (!matches.length) return null;
  const proof = verifySeal(matches[0]);
  const capability = recovery.capabilities?.[proof.invocation.capabilityReceiptHash];
  if (!capability || proof.bindingHash !== binding.hash || proof.additionalProviderAttempts !== 0
    || hash(proof.outputContractRef) !== hash(prepared.job.outputContractRef)
    || hash(proof.invocation.roleRef) !== hash(prepared.roleRef)
    || hash(proof.invocation.outputContractRef) !== hash(prepared.job.outputContractRef)
    || proof.invocation.contextManifestRef.hash !== prepared.capsule.hash
    || proof.semanticAcceptanceInherited !== false || proof.trainingTruth !== false
    || capability.receiptHash !== proof.invocation.capabilityReceiptHash) invalid();
  return { proof, capability };
}

export async function materializeOpeningFenceFactionFragmentV1({ prepared, plan, origin, recovery, store, dsh }) {
  const authenticate = async () => {
    const result = await recovery.authenticate(origin.proof);
    if (verifySeal(result.proof).hash !== origin.proof.hash) invalid();
    return result;
  };
  const recovered = await materializeOpeningFenceRecoveryV1({ authenticate, store, dsh });
  return seal({ protocol: FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1,
    jobId: prepared.job.id, planHash: plan.hash, contextHash: prepared.capsule.hash,
    outputContractHash: prepared.contract.contractHash, value: recovered.record.proof.providerValue,
    runId: store.summary().runId, originRunId: origin.proof.originRunId, attemptId: origin.proof.originAttemptId,
    openingFenceRecoveryRecord: recovered.record, loop: recovered.record.loop,
    semanticAcceptance: false, trainingTruth: false });
}

export function verifyOpeningFenceFactionFragmentV1({ part, plan, prepared, egressBinding,
  invocation, request, dshBindingHash, recovery }) {
  verifySeal(part);
  const origin = openingFenceForFactionFragmentV1({ prepared, recovery });
  if (!origin || part.protocol !== FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1
    || hash(origin.proof.invocation) !== hash(invocation) || origin.proof.originalRequestHash !== hash(request)
    || origin.proof.providerProfileHash !== egressBinding.providerProfileRef.hash
    || part.planHash !== plan.hash || part.jobId !== prepared.job.id || part.contextHash !== prepared.capsule.hash
    || part.outputContractHash !== prepared.contract.contractHash || part.semanticAcceptance !== false || part.trainingTruth !== false
    || part.originRunId !== origin.proof.originRunId || part.attemptId !== origin.proof.originAttemptId
    || part.attemptId !== request.requestId || hash(part.value) !== hash(origin.proof.providerValue)
    || hash(part.loop) !== hash(part.openingFenceRecoveryRecord.loop)) invalid();
  verifyOpeningFenceRecoveryRecordV1({ record: part.openingFenceRecoveryRecord, authenticated: origin.proof, dshBindingHash });
  return { providerReceiptHash: origin.proof.originalProviderReceiptHash };
}
