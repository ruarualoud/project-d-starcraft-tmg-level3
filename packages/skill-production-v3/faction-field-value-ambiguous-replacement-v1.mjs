import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

const AUTHORIZATION_VERSION = 'faction_ambiguous_replacement_v1';

export const FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_BINDING_V1 = seal({
  version: 'faction_field_value_ambiguous_replacement_v1',
  authorizationBindingVersion: AUTHORIZATION_VERSION,
  eligibleFailure: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND',
  maximumReplacementAttemptsPerOrigin: 1,
  originalAttemptImmutable: true,
  originalUnknownUsageReserveRetained: true,
  replacementRequiresDistinctContinuationBoundRequest: true,
  replacementRequiresDurableFamilyChoice: true,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});

const invalid = suffix => fail('FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_' + suffix);

// Builds no network authority on its own. The caller must persist `choice`
// before its normal production store is allowed to reserve the distinct
// continuation-bound request.
export function prepareFactionFieldValueAmbiguousReplacementV1({
  authorizationBinding, family, round, context, originalChoice,
  originalAttempt, originalFailureReceipt, originalIssue, originalRuntimeReceipt,
  originalInvocation, originalRequest,
  replacementCapability, replacementWireBinding, replacementOwnerRunId,
}) {
  [authorizationBinding, family, context, originalChoice,
    originalIssue, originalRuntimeReceipt].forEach(verifySeal);
  if (authorizationBinding.version !== AUTHORIZATION_VERSION
    || authorizationBinding.eligibleFailure !== 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'
    || authorizationBinding.maximumReplacementAttemptsPerOrigin !== 1
    || !Number.isSafeInteger(round) || round < 0 || originalChoice.round !== round
    || originalChoice.familyHash !== family.hash || originalChoice.contextHash !== context.hash
    || !originalAttempt || originalAttempt.run !== originalChoice.ownerRunId
    || originalAttempt.id !== originalChoice.request?.requestId
    || originalAttempt.request_hash !== hash(originalChoice.request)
    || originalAttempt.state !== 'failed'
    || originalAttempt.code !== FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_BINDING_V1.eligibleFailure
    || originalAttempt.usage !== null || originalAttempt.settled !== null
    || !Number.isSafeInteger(originalAttempt.reserve) || originalAttempt.reserve < 1
    || !Number.isSafeInteger(originalAttempt.token_reserve) || originalAttempt.token_reserve < 1)
    invalid('ORIGIN');
  const { receiptHash, ...receiptBody } = originalFailureReceipt;
  const { receiptHash: replacementCapabilityHash, ...replacementCapabilityBody } = replacementCapability || {};
  if (!originalInvocation || originalInvocation.continuationRef !== null
    || originalInvocation.capabilityReceiptHash !== originalChoice.capability.receiptHash
    || hash(originalInvocation.roleRef) !== hash(context.roleRef)
    || originalInvocation.contextManifestRef?.hash !== context.hash
    || hash(originalInvocation.outputContractRef) !== hash(context.outputContractRef)
    || originalInvocation.contextPayloadHash !== hash({ instructions: context.instructions, input: context.compiledInput })
    || !originalRequest || hash(originalRequest) !== originalAttempt.request_hash
    || hash(originalRequest) !== hash(originalChoice.request)) invalid('ORIGINAL_REQUEST');
  if (hash(receiptBody) !== receiptHash || originalFailureReceipt.code !== originalAttempt.code
    || originalFailureReceipt.usageKnown !== false || originalFailureReceipt.usage !== null
    || originalFailureReceipt.requestMayHaveBeenSent !== true
    || originalFailureReceipt.requestDefinitelyNotSent !== false
    || originalFailureReceipt.physicalAttempts !== 1 || originalFailureReceipt.automaticRetries !== 0
    || originalFailureReceipt.capabilityReceiptHash !== originalChoice.capability.receiptHash
    || hash(originalFailureReceipt.outputContractRef) !== hash(context.outputContractRef)
    || originalIssue.code !== originalAttempt.code || originalIssue.class !== 'ambiguous_egress'
    || originalIssue.invocationHash !== hash(originalInvocation)
    || originalIssue.safeReceiptHash !== receiptHash || originalIssue.rejectedCandidateRef !== null
    || originalRuntimeReceipt.invocationHash !== hash(originalInvocation)
    || originalRuntimeReceipt.attemptId !== originalAttempt.id
    || originalRuntimeReceipt.issueHash !== originalIssue.hash
    || originalRuntimeReceipt.status !== 'stopped'
    || originalRuntimeReceipt.candidateHash !== null
    || originalRuntimeReceipt.providerAttempts !== 1
    || originalRuntimeReceipt.automaticRetries !== 0)
    invalid('EVIDENCE');
  if (hash(replacementCapabilityBody) !== replacementCapabilityHash
    || !replacementOwnerRunId || replacementCapability.outputContractRef.hash !== context.outputContractRef.hash
    || replacementCapability.capability !== 'responses_json_schema'
    || hash(replacementCapability.providerProfileRef) !== hash(replacementWireBinding?.providerProfileRef)
    || replacementCapability.model !== replacementWireBinding?.model)
    invalid('REPLACEMENT_EXECUTION');
  const grant = seal({ version: 'faction_field_value_ambiguous_replacement_grant_v1',
    bindingHash: FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_BINDING_V1.hash,
    authorizationBindingHash: authorizationBinding.hash,
    familyHash: family.hash, round, contextHash: context.hash,
    originRunId: originalAttempt.run, originAttemptId: originalAttempt.id,
    originalAttemptHash: hash(originalAttempt), originalRequestHash: originalAttempt.request_hash,
    originalReceiptHash: receiptHash, originalIssueHash: originalIssue.hash,
    originalRuntimeReceiptHash: originalRuntimeReceipt.hash,
    originalReserveMicros: originalAttempt.reserve,
    originalTokenReserve: originalAttempt.token_reserve,
    originalDisposition: 'abandoned_unknown_delivery_reserve_retained_not_reconciled',
    maximumReplacementAttempts: 1, semanticAcceptance: false, trainingTruth: false });
  const continuationRef = { id: 'faction-field-value-ambiguous-replacement.' + grant.hash.slice(0, 32),
    version: 'v1', hash: grant.hash };
  const replacementInvocation = { ...originalInvocation,
    capabilityReceiptHash: replacementCapability.receiptHash, continuationRef };
  const request = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
    requestId: 'structured-' + hash(replacementInvocation).slice(0, 48), roleRef: context.roleRef,
    instructions: context.instructions, input: context.compiledInput,
    outputContractRef: context.outputContractRef, maxOutputUnits: originalRequest.maxOutputUnits };
  if (request.requestId === originalAttempt.id || hash(request) === originalAttempt.request_hash)
    invalid('ORIGINAL_REISSUE');
  const choice = seal({ version: 'faction_field_value_ambiguous_replacement_dispatch_v1',
    familyHash: family.hash, round, contextHash: context.hash,
    ownerRunId: replacementOwnerRunId, capability: replacementCapability,
    wireBinding: replacementWireBinding, egressBindingHash: hash(replacementWireBinding),
    continuationRef, request: { requestId: request.requestId, requestHash: hash(request) },
    grant, trainingTruth: false });
  return { grant, continuationRef, invocation: replacementInvocation, request, choice,
    providerCalls: 0, semanticAcceptance: false, trainingTruth: false };
}
