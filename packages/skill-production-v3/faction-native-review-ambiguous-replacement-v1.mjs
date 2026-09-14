import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

export const FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_BINDING_V1 = seal({
  version: 'faction_native_review_ambiguous_replacement_v1',
  authorizationBindingVersion: 'faction_ambiguous_replacement_v1',
  eligibleFailure: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND',
  maximumReplacementAttemptsPerOrigin: 1,
  originalAttemptImmutable: true,
  originalUnknownUsageReserveRetained: true,
  replacementRequiresDistinctContinuationBoundRequest: true,
  replacementCapabilityPersistedForRestart: true,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});
const binding = FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_BINDING_V1;
const invalid = suffix => fail('FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_' + suffix);

export function createFactionNativeReviewInvocationIdentityV1({ capsule,
  roleRef, outputContractRef, executionPolicyRef, capabilityReceiptHash,
  maxOutputUnits, continuationRef = null }) {
  const body = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
    roleRef, contextManifestRef: { id: `context.${roleRef.id}`,
      version: capsule.version, hash: capsule.hash },
    outputContractRef, executionPolicyRef, continuationRef,
    contextPayloadHash: hash({ instructions: capsule.instructions,
      input: capsule.compiledInput }), capabilityReceiptHash,
    trainingTruth: false };
  const invocationHash = hash(body);
  const attemptId = `structured-${invocationHash.slice(0, 48)}`;
  const request = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
    requestId: attemptId, roleRef, instructions: capsule.instructions,
    input: capsule.compiledInput, outputContractRef, maxOutputUnits };
  return { body, invocationHash, attemptId, request, requestHash: hash(request) };
}

export function prepareFactionNativeReviewAmbiguousReplacementV1({
  authorizationBinding, capsule, roleRef, outputContractRef,
  executionPolicyRef, maxOutputUnits, originalEvidence,
  replacementCapability,
}) {
  [authorizationBinding, capsule, originalEvidence.issue,
    originalEvidence.runtimeReceipt, originalEvidence.ownerRecipe].forEach(verifySeal);
  const attempt = originalEvidence.attempt;
  const failureReceipt = originalEvidence.failureReceipt;
  const { receiptHash, ...receiptBody } = failureReceipt || {};
  if (authorizationBinding.version !== binding.authorizationBindingVersion
    || authorizationBinding.eligibleFailure !== binding.eligibleFailure
    || authorizationBinding.maximumReplacementAttemptsPerOrigin !== 1
    || !attempt || attempt.state !== 'failed' || attempt.code !== binding.eligibleFailure
    || attempt.usage !== null || attempt.settled !== null
    || !Number.isSafeInteger(attempt.reserve) || attempt.reserve < 1
    || !Number.isSafeInteger(attempt.token_reserve) || attempt.token_reserve < 1
    || attempt.run !== `faction-v1-${originalEvidence.ownerRecipe.hash.slice(0, 20)}`
    || hash(receiptBody) !== receiptHash || failureReceipt.code !== attempt.code
    || failureReceipt.usageKnown !== false || failureReceipt.usage !== null
    || failureReceipt.requestMayHaveBeenSent !== true
    || failureReceipt.requestDefinitelyNotSent !== false
    || failureReceipt.physicalAttempts !== 1 || failureReceipt.automaticRetries !== 0
    || failureReceipt.capabilityReceiptHash !== originalEvidence.capability.receiptHash
    || failureReceipt.outputContractRef?.hash !== outputContractRef.hash
    || originalEvidence.issue.code !== attempt.code
    || originalEvidence.issue.class !== 'ambiguous_egress'
    || originalEvidence.issue.safeReceiptHash !== receiptHash
    || originalEvidence.issue.rejectedCandidateRef !== null
    || originalEvidence.runtimeReceipt.attemptId !== attempt.id
    || originalEvidence.runtimeReceipt.issueHash !== originalEvidence.issue.hash
    || originalEvidence.runtimeReceipt.status !== 'stopped'
    || originalEvidence.runtimeReceipt.candidateHash !== null
    || originalEvidence.runtimeReceipt.providerAttempts !== 1
    || originalEvidence.runtimeReceipt.automaticRetries !== 0
    || replacementCapability.outputContractRef?.hash !== outputContractRef.hash
    || replacementCapability.capability !== 'responses_json_schema') invalid('ORIGIN');
  const original = createFactionNativeReviewInvocationIdentityV1({ capsule,
    roleRef, outputContractRef, executionPolicyRef,
    capabilityReceiptHash: failureReceipt.capabilityReceiptHash,
    maxOutputUnits });
  if (attempt.id !== original.attemptId || attempt.request_hash !== original.requestHash
    || originalEvidence.issue.invocationHash !== original.invocationHash
    || originalEvidence.runtimeReceipt.invocationHash !== original.invocationHash)
    invalid('ORIGINAL_REQUEST');
  const grant = seal({ version: binding.version + '.grant', bindingHash: binding.hash,
    authorizationBindingHash: authorizationBinding.hash,
    originRunId: attempt.run, originAttemptId: attempt.id,
    originalAttemptHash: hash(attempt), originalRequestHash: attempt.request_hash,
    originalReceiptHash: receiptHash, originalIssueHash: originalEvidence.issue.hash,
    originalRuntimeReceiptHash: originalEvidence.runtimeReceipt.hash,
    originalReserveMicros: attempt.reserve, originalTokenReserve: attempt.token_reserve,
    contextHash: capsule.hash, roleRefHash: hash(roleRef),
    outputContractHash: outputContractRef.hash,
    replacementCapabilityReceiptHash: replacementCapability.receiptHash,
    originalDisposition: 'abandoned_unknown_delivery_reserve_retained_not_reconciled',
    maximumReplacementAttempts: 1, semanticAcceptance: false, trainingTruth: false });
  const continuationRef = { id: 'faction-native-review-ambiguous-replacement.'
    + grant.hash.slice(0, 32), version: 'v1', hash: grant.hash };
  const replacement = createFactionNativeReviewInvocationIdentityV1({ capsule,
    roleRef, outputContractRef, executionPolicyRef,
    capabilityReceiptHash: replacementCapability.receiptHash,
    maxOutputUnits, continuationRef });
  if (replacement.attemptId === attempt.id || replacement.requestHash === attempt.request_hash)
    invalid('ORIGINAL_REISSUE');
  return seal({ version: binding.version + '.record', bindingHash: binding.hash,
    grant, continuationRef, replacementCapability,
    replacementAttemptId: replacement.attemptId,
    replacementRequestHash: replacement.requestHash,
    originalProviderCallsReplayed: 0, replacementCallsPermitted: 1,
    semanticAcceptance: false, trainingTruth: false });
}

export function verifyFactionNativeReviewAmbiguousReplacementV1(options) {
  const record = verifySeal(options.record);
  const rebuilt = prepareFactionNativeReviewAmbiguousReplacementV1(options);
  if (record.hash !== rebuilt.hash) invalid('RECORD_DRIFT');
  return record;
}
