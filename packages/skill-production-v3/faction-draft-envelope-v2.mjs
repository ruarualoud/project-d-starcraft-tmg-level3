import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';

// Frozen Provider V1 remains a writing target, not an excuse to discard
// distinct evidence or invent uncertainty prose solely to fill an array.
export const FACTION_DRAFT_ENVELOPE_BINDING_V2 = seal({ version: 'faction_draft_envelope_v2',
  maximumAdviceSourceRefs: 128, minimumUnprovenItems: 0, maximumUnprovenItems: 16,
  sourceOperation: 'preserve_every_distinct_known_reference_in_original_order',
  emptyUnprovenMeaning: 'model_reported_none_not_evidence_of_no_uncertainty',
  acceptedPaths: ['$.items[*].value.sourceRefs', '$.items[*].value.unproven'],
  originalProviderSchemaUnchanged: true, substantiveAdviceFieldsUnchanged: true,
  originalPaidFailurePreserved: true, automaticProviderRetries: 0,
  freshWholeSectionReviewRequired: true, independentStrategyEvaluationRequired: true,
  semanticAcceptanceInherited: false, canAffectRules: false, trainingTruth: false });

export function validateFactionDraftEnvelopeBindingV2(binding) {
  if (verifySeal(binding).hash !== FACTION_DRAFT_ENVELOPE_BINDING_V2.hash) fail('FACTION_DRAFT_ENVELOPE_BINDING_INVALID');
  return binding;
}

export function normalizeFactionDraftEnvelopeV2({ input, value, binding }) {
  verifySeal(input); validateFactionDraftEnvelopeBindingV2(binding);
  const contract = contracts.items, originalValidation = validate(contract.providerSchema, value);
  const allowed = originalValidation.issues.length && originalValidation.issues.every(i =>
    /^\$\.items\[\d+\]\.value\.sourceRefs$/u.test(i.path) && ['array_too_long', 'array_items_not_unique'].includes(i.code)
    || /^\$\.items\[\d+\]\.value\.unproven$/u.test(i.path) && i.code === 'array_too_short' && i.actualItems === 0);
  if (!allowed) fail('FACTION_DRAFT_ENVELOPE_NOT_APPLICABLE');
  const output = structuredClone(value), known = new Set(input.frozenSources.prompt.sources.map(s => s.ref)), repairs = [];
  for (const [ordinal, item] of output.items.entries()) {
    if (item.value.sourceRefs.some(ref => !known.has(ref))) fail('FACTION_DRAFT_ENVELOPE_UNKNOWN_SOURCE');
    const original = item.value.sourceRefs, normalized = [...new Set(original)];
    if (normalized.length !== original.length) {
      item.value.sourceRefs = normalized;
      repairs.push({ path: '$.items[' + ordinal + '].value.sourceRefs', original, normalized,
        removedIndices: original.flatMap((ref, i) => original.indexOf(ref) === i ? [] : [i]) });
    }
  }
  const hostSchema = structuredClone(contract.providerSchema);
  const advice = hostSchema.properties.items.items.properties.value.properties;
  advice.sourceRefs.maxItems = binding.maximumAdviceSourceRefs;
  advice.unproven.minItems = binding.minimumUnprovenItems;
  const hostValidation = validate(hostSchema, output);
  if (!hostValidation.ok) fail('FACTION_DRAFT_ENVELOPE_HOST_SCHEMA_INVALID');
  return seal({ version: 'faction_draft_envelope_normalization_v2', bindingHash: binding.hash,
    inputHash: input.hash, originalOutputHash: hash(value), output, outputHash: hash(output),
    originalValidation, hostValidation, hostSchemaHash: hash(hostSchema), repairs,
    emptyUnprovenIndices: output.items.filter(i => i.value.unproven.length === 0).map(i => i.index),
    allDistinctReferencesPreserved: true, proseChanged: false, emptyUnprovenAcceptedAsProof: false,
    freshWholeSectionReviewRequired: true, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function materializeFactionDraftEnvelopeV2({ input, prepared, evidence, binding }) {
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected].forEach(verifySeal);
  const normalized = normalizeFactionDraftEnvelopeV2({ input, value: rejected.providerValue, binding });
  const receipt = verifySeal(JSON.parse(attempt.response)).value, usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...body } = receipt;
  const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
    roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef: prepared.outputContractRef,
    executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
    contextPayloadHash: hash({ instructions: prepared.instructions, input: prepared.payload }),
    capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
  if (prepared.kind !== 'items' || attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0 || hash(body) !== receiptHash
    || receipt.code !== attempt.code || receipt.status !== 200 || receipt.incompleteReason !== null || !receipt.usageKnown
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0 || !receipt.outputTextHash
    || hash(receipt.usage) !== hash(usage) || hash(receipt.schemaIssues) !== hash(normalized.originalValidation.issues)
    || hash(rejected.validation) !== hash(normalized.originalValidation) || issue.safeReceiptHash !== receiptHash
    || rejected.safeReceiptHash !== receiptHash || issue.rejectedCandidateRef?.hash !== rejected.hash
    || issue.invocationHash !== rejected.invocationHash || hash(invocation) !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(prepared.outputContractRef)
    || hash(rejected.outputContractRef) !== hash(prepared.outputContractRef)
    || hash(rejected.roleRef) !== hash(prepared.roleRef) || hash(rejected.contextManifestRef) !== hash(prepared.contextManifestRef))
    fail('FACTION_DRAFT_ENVELOPE_EVIDENCE_INVALID');
  return seal({ version: 'faction_draft_envelope_materialization_v2', bindingHash: binding.hash,
    inputHash: input.hash, fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput),
    originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash, rejectedCandidateHash: rejected.hash, originalFailureReceiptHash: receiptHash,
    normalized, output: normalized.output, originalUsage: usage, originalSettledMicros: attempt.settled,
    providerCalls: 0, originalProviderSchemaPassed: false, semanticAcceptanceInherited: false,
    freshWholeSectionReviewRequired: true, trainingTruth: false });
}
