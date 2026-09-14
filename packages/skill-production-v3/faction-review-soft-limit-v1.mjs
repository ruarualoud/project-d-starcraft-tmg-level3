import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { inspectFactionReviewNarrativeCapacityV2 } from './faction-parsed-review-value-v1.mjs';

export const FACTION_REVIEW_SOFT_LIMIT_BINDING_V1 = seal({
  version: 'faction_review_soft_limit_v1',
  artificialTextThresholdsAreAlerts: true,
  originalPaidFailurePreserved: true,
  originalProviderValuePreserved: true,
  providerSuccessInvented: false,
  additionalProviderAttempts: 0,
  structuralAndEvidenceFailuresRemainBlocking: true,
  semanticAcceptance: false,
  runtimeAccepted: false,
  trainingTruth: false,
});

const binding = FACTION_REVIEW_SOFT_LIMIT_BINDING_V1;
const invalid = code => fail('FACTION_REVIEW_SOFT_LIMIT_' + code);

// This proof is derived only after the normal paid-failure verifier has
// authenticated the journal, request, capability, context and schema issue.
// It never changes the historical attempt from failed to accepted.
export function authenticateFactionReviewSoftLimitV1({ capsule, evidence,
  nativeFailureProof }) {
  [capsule, evidence?.issue, evidence?.rejected, evidence?.runtimeReceipt,
    evidence?.ownerRecipe].forEach(verifySeal);
  const capacity = inspectFactionReviewNarrativeCapacityV2(
    evidence.rejected.providerValue);
  if (evidence.attempt?.state !== 'failed'
    || evidence.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || nativeFailureProof?.providerReceiptHash !== evidence.rejected.safeReceiptHash
    || evidence.issue.rejectedCandidateRef?.hash !== evidence.rejected.hash
    || evidence.runtimeReceipt.issueHash !== evidence.issue.hash
    || evidence.runtimeReceipt.status !== 'quarantined'
    || evidence.runtimeReceipt.invocationHash !== evidence.rejected.invocationHash
    || evidence.rejected.contextManifestRef?.hash !== capsule.hash
    || capacity.outputHash !== hash(evidence.rejected.providerValue)) {
    invalid('AUTHENTICATION_DRIFT');
  }
  return seal({ version: binding.version + '.authenticated', bindingHash: binding.hash,
    originRunId: evidence.attempt.run, originAttemptId: evidence.attempt.id,
    originalContextHash: capsule.hash,
    rejectedCandidateRef: { hash: evidence.rejected.hash },
    issueRef: { hash: evidence.issue.hash },
    runtimeReceiptRef: { hash: evidence.runtimeReceipt.hash },
    providerReceiptHash: nativeFailureProof.providerReceiptHash,
    nativeFailureProofHash: hash(nativeFailureProof),
    providerValueHash: hash(evidence.rejected.providerValue),
    capacityProof: capacity,
    originalAttemptStatePreserved: 'failed', providerSuccessInvented: false,
    additionalProviderAttempts: 0, semanticAcceptance: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function inspectFactionReviewSoftLimitRecordV1({ record, capsule,
  providerOutput, authentication = null }) {
  [record, capsule].forEach(verifySeal);
  const capacity = inspectFactionReviewNarrativeCapacityV2(providerOutput);
  if (record.version !== binding.version || record.bindingHash !== binding.hash
    || record.originalContextHash !== capsule.hash
    || record.providerValueHash !== hash(providerOutput)
    || record.capacityProof?.hash !== capacity.hash
    || record.additionalProviderAttempts !== 0
    || record.providerSuccessInvented !== false
    || record.semanticAcceptance !== false || record.runtimeAccepted !== false
    || record.trainingTruth !== false) invalid('RECORD_DRIFT');
  if (authentication) {
    verifySeal(authentication);
    if (record.authenticatedFailureProofHash !== authentication.hash
      || authentication.bindingHash !== binding.hash
      || authentication.originalContextHash !== capsule.hash
      || authentication.providerValueHash !== hash(providerOutput)
      || authentication.rejectedCandidateRef?.hash !== record.rejectedCandidateRef?.hash
      || authentication.capacityProof?.hash !== capacity.hash)
      invalid('REAUTHENTICATION_DRIFT');
  }
  return { output: providerOutput, capacity };
}

export function verifyFactionReviewSoftLimitRecordV1({ record, capsule,
  providerOutput, authentication, dshBindingHash }) {
  const inspected = inspectFactionReviewSoftLimitRecordV1({ record, capsule,
    providerOutput, authentication });
  const loop = verifySeal(record.loop);
  const command = { action: 'finish', content: inspected.output };
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt
    || loop.calls !== 1 || loop.toolTrace.length || loop.transcript.length !== 1
    || loop.transcript[0].call !== 1
    || loop.transcript[0].receiptHash !== authentication.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(inspected.output)
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false)
    invalid('DSH_DRIFT');
  return { output: inspected.output,
    providerReceiptHashes: [authentication.providerReceiptHash],
    additionalProviderAttempts: 0 };
}

export async function materializeFactionReviewSoftLimitV1({ capsule, evidence,
  nativeFailureProof, store, dsh }) {
  const authentication = authenticateFactionReviewSoftLimitV1({ capsule,
    evidence, nativeFailureProof });
  const providerOutput = evidence.rejected.providerValue;
  const id = evidence.attempt.id + '.review-soft-limit-v1';
  const lease = store.acquire(id, { authenticationHash: authentication.hash,
    capsuleHash: capsule.hash, bindingHash: binding.hash,
    dshBindingHash: dsh.binding.hash });
  try {
    let record;
    if (lease.cached) record = verifySeal(lease.artifact);
    else {
      const loop = await dsh.run({
        task: 'Materialize the authenticated review unchanged. Artificial narrative-length thresholds are alerts; structure, coordinates, sources and evidence remain strict.',
        callModel: async () => ({ command: { action: 'finish', content: providerOutput },
          receiptHash: authentication.hash,
          usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0 } }),
        toolPort: { execute: () => invalid('TOOLS_FORBIDDEN'),
          trace: () => [], readRefs: () => [] },
        limits: { maxCalls: 1, maxTools: 0, maxOutput: 1_000_000,
          maxWallMs: 180000 },
      });
      record = seal({ version: binding.version, bindingHash: binding.hash,
        originalContextHash: capsule.hash,
        authenticatedFailureProofHash: authentication.hash,
        rejectedCandidateRef: authentication.rejectedCandidateRef,
        issueRef: authentication.issueRef,
        runtimeReceiptRef: authentication.runtimeReceiptRef,
        providerValueHash: authentication.providerValueHash,
        capacityProof: authentication.capacityProof, loop,
        additionalProviderAttempts: 0, providerSuccessInvented: false,
        semanticAcceptance: false, runtimeAccepted: false,
        trainingTruth: false });
    }
    verifyFactionReviewSoftLimitRecordV1({ record, capsule, providerOutput,
      authentication, dshBindingHash: dsh.binding.hash });
    return lease.cached ? record : store.finish(lease, record);
  } catch (error) {
    if (!lease.cached) store.release(lease);
    throw error;
  }
}
