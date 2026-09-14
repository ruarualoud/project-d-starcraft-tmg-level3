import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from
  '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from
  '../structured-generation/output-contract-registry-v1.mjs';

const contract = contracts.outline;
const outputContractRef = outputContractRefStarcraftTmgV1(contract);

// Provider V1 remains frozen at 600 characters as a concise-writing target.
// Host V2 may accept a complete paid answer up to 1600 characters per focus,
// but only when every V1 schema issue is exactly that one capacity mismatch.
export const FACTION_OUTLINE_CAPACITY_BINDING_V1 = seal({
  version: 'faction_outline_narrative_capacity_v1',
  providerContractRef: outputContractRef,
  providerWritingTargetFocusLength: 600,
  hostMaximumFocusLength: 1600,
  acceptedIssuePath: '$.outline[*].focus',
  acceptedIssueCode: 'string_too_long',
  originalProviderSchemaUnchanged: true,
  originalPaidFailurePreserved: true,
  originalCandidateBytesPreserved: true,
  providerRegenerationRequired: false,
  automaticProviderRetries: 0,
  freshSourceAndSemanticReviewRequired: true,
  semanticAcceptanceInherited: false,
  canAffectRules: false,
  trainingTruth: false,
});

export function validateFactionOutlineCapacityBindingV1(binding) {
  if (verifySeal(binding).hash !== FACTION_OUTLINE_CAPACITY_BINDING_V1.hash)
    fail('FACTION_OUTLINE_CAPACITY_BINDING_INVALID');
  return binding;
}

export function normalizeFactionOutlineCapacityV1({ input, value, binding }) {
  verifySeal(input);
  const capacity = validateFactionOutlineCapacityBindingV1(binding);
  const originalValidation = validate(contract.providerSchema, value);
  if (!originalValidation.issues.length || originalValidation.issues.some(issue =>
    !/^\$\.outline\[\d+\]\.focus$/u.test(issue.path)
    || issue.code !== capacity.acceptedIssueCode
    || issue.maxLength !== capacity.providerWritingTargetFocusLength
    || !Number.isSafeInteger(issue.actualLength)
    || issue.actualLength <= capacity.providerWritingTargetFocusLength
    || issue.actualLength > capacity.hostMaximumFocusLength)) {
    fail('FACTION_OUTLINE_CAPACITY_NOT_APPLICABLE');
  }
  const known = new Set(input.frozenSources.prompt.sources.map(source => source.ref));
  if (value.outline.some(item => item.sourceRefs.some(ref => !known.has(ref))))
    fail('FACTION_OUTLINE_CAPACITY_UNKNOWN_SOURCE');
  const hostSchema = structuredClone(contract.providerSchema);
  hostSchema.properties.outline.items.properties.focus.maxLength =
    capacity.hostMaximumFocusLength;
  const hostValidation = validate(hostSchema, value);
  if (!hostValidation.ok) fail('FACTION_OUTLINE_CAPACITY_HOST_SCHEMA_INVALID');
  const output = structuredClone(value);
  return seal({
    version: 'faction_outline_narrative_capacity_normalization_v1',
    bindingHash: capacity.hash,
    inputHash: input.hash,
    providerContractRef: outputContractRef,
    originalOutputHash: hash(value),
    output,
    outputHash: hash(output),
    originalValidation,
    hostValidation,
    hostSchemaHash: hash(hostSchema),
    focusLengths: output.outline.map(item => item.focus.length),
    contentChanged: false,
    sourceReferencesChanged: false,
    originalProviderSchemaPassed: false,
    hostCapacitySchemaPassed: true,
    freshSourceAndSemanticReviewRequired: true,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}

export function materializeFactionOutlineCapacityV1({ input, request, prepared,
  evidence, binding }) {
  const inspected = inspectFactionOutlineCapacityEvidenceV1({ input, evidence,
    binding });
  const { attempt, issue, rejected } = evidence;
  [request.packet, issue, rejected].forEach(verifySeal);
  const { normalized, receipt, usage } = inspected;
  const invocation = {
    schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
    roleRef: prepared.roleRef,
    contextManifestRef: prepared.contextManifestRef,
    outputContractRef: prepared.outputContractRef,
    executionPolicyRef: prepared.executionPolicyRef,
    continuationRef: null,
    contextPayloadHash: hash({ instructions: prepared.instructions,
      input: prepared.payload }),
    capabilityReceiptHash: receipt.capabilityReceiptHash,
    trainingTruth: false,
  };
  if (prepared.kind !== 'outline'
    || prepared.fullRoleId !== request.packet.id + '.' + request.roleId
    || attempt.state !== 'failed'
    || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0
    || issue.invocationHash !== rejected.invocationHash
    || hash(invocation) !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.outputContractRef) !== hash(outputContractRef)
    || hash(prepared.outputContractRef) !== hash(outputContractRef)
    || hash(prepared.roleInput.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.roleRef) !== hash(prepared.roleRef)
    || hash(rejected.contextManifestRef) !== hash(prepared.contextManifestRef)) {
    fail('FACTION_OUTLINE_CAPACITY_EVIDENCE_INVALID');
  }
  return seal({
    version: 'faction_outline_narrative_capacity_materialization_v1',
    bindingHash: binding.hash,
    inputHash: input.hash,
    fullRoleId: prepared.fullRoleId,
    roleInputHash: hash(prepared.roleInput),
    originRunId: attempt.run,
    originAttemptId: attempt.id,
    originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash,
    rejectedCandidateHash: rejected.hash,
    originalFailureReceiptHash: receipt.receiptHash,
    normalized,
    output: normalized.output,
    originalUsage: usage,
    originalSettledMicros: attempt.settled,
    providerCalls: 0,
    contentChanged: false,
    sourceReferencesChanged: false,
    originalProviderSchemaPassed: false,
    freshSourceAndSemanticReviewRequired: true,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}

export function inspectFactionOutlineCapacityEvidenceV1({ input, evidence,
  binding }) {
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected].forEach(verifySeal);
  const normalized = normalizeFactionOutlineCapacityV1({
    input, value: rejected.providerValue, binding,
  });
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...receiptBody } = receipt;
  if (attempt.state !== 'failed'
    || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0
    || hash(receiptBody) !== receiptHash || receipt.code !== attempt.code
    || receipt.status !== 200 || receipt.incompleteReason !== null
    || !receipt.usageKnown || receipt.physicalAttempts !== 1
    || receipt.automaticRetries !== 0 || !receipt.outputTextHash
    || hash(receipt.usage) !== hash(usage)
    || hash(receipt.schemaIssues) !== hash(normalized.originalValidation.issues)
    || hash(rejected.validation) !== hash(normalized.originalValidation)
    || issue.safeReceiptHash !== receiptHash
    || rejected.safeReceiptHash !== receiptHash
    || issue.rejectedCandidateRef?.hash !== rejected.hash
    || issue.invocationHash !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.outputContractRef) !== hash(outputContractRef)) {
    fail('FACTION_OUTLINE_CAPACITY_ORIGIN_EVIDENCE_INVALID');
  }
  return seal({
    version: 'faction_outline_capacity_evidence_v1',
    originRunId: attempt.run,
    originAttemptId: attempt.id,
    originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash,
    rejectedCandidateHash: rejected.hash,
    originalFailureReceiptHash: receiptHash,
    invocationHash: rejected.invocationHash,
    roleRef: rejected.roleRef,
    contextManifestRef: rejected.contextManifestRef,
    normalized,
    receipt,
    usage,
    providerCalls: 0,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}
