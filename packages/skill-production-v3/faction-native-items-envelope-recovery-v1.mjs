import { hash, seal, verifySeal, sha256, fail } from
  '../skill-production/common.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from
  '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from
  '../structured-generation/output-contract-registry-v1.mjs';
import { normalizeFactionBatchEnvelopeV1,
  validateFactionDraftBatchV1 } from './faction-strategy-workflow-v1.mjs';

const contract = contracts.items;
const outputContractRef = outputContractRefStarcraftTmgV1(contract);
const fields = Object.freeze(['title', 'when', 'procedure', 'alternatives',
  'risk', 'reviseIf', 'sourceRefs', 'unproven']);

// The model occasionally omits the transport-only `value` wrapper while
// returning the complete authored advice object. This contract permits one
// lossless Host move; it does not repair prose, sources, indices or omissions.
export const FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_V1 = seal({
  version: 'faction_native_items_envelope_recovery_v1',
  providerContractRef: outputContractRef,
  acceptedShape: 'items_index_plus_all_advice_fields_flat',
  normalizedShape: 'items_index_plus_value_advice_object',
  movedFields: fields,
  allItemsMustUseSameFlatShape: true,
  fieldValuesChanged: false,
  originalPaidFailurePreserved: true,
  originalProviderSchemaUnchanged: true,
  providerRegenerationRequired: false,
  automaticProviderRetries: 0,
  freshWholeSectionReviewRequired: true,
  semanticAcceptanceInherited: false,
  canAffectRules: false,
  trainingTruth: false,
});

export function validateFactionNativeItemsEnvelopeBindingV1(binding) {
  if (verifySeal(binding).hash
      !== FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_V1.hash) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_INVALID');
  }
  return binding;
}

export function normalizeFactionNativeItemsEnvelopeV1({ input, value,
  binding }) {
  verifySeal(input);
  const selected = validateFactionNativeItemsEnvelopeBindingV1(binding);
  const originalValidation = validate(contract.providerSchema, value);
  const allowed = originalValidation.issues.length > 0
    && originalValidation.issues.every(issue =>
      /^\$\.items\[\d+\]\.value$/u.test(issue.path)
        && issue.code === 'required_field_missing'
      || new RegExp('^\\$\\.items\\[\\d+\\]\\.('
        + fields.join('|') + ')$').test(issue.path)
        && issue.code === 'additional_property_forbidden');
  if (!allowed || !Array.isArray(value?.items) || !value.items.length
    || value.items.some(item => Object.hasOwn(item || {}, 'value'))) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_NOT_APPLICABLE');
  }
  const normalized = normalizeFactionBatchEnvelopeV1(value);
  if (normalized.receipt.moved.length !== value.items.length
    || normalized.receipt.fieldValuesChanged !== false
    || !validate(contract.providerSchema, normalized.output).ok) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_UNRESOLVED');
  }
  const known = new Set(input.frozenSources.prompt.sources.map(row => row.ref));
  if (normalized.output.items.some(row =>
    row.value.sourceRefs.some(ref => !known.has(ref)))) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_UNKNOWN_SOURCE');
  }
  const reverse = { items: normalized.output.items.map(({ index, value }) =>
    ({ index, ...value })) };
  if (hash(reverse) !== hash(value))
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_NOT_LOSSLESS');
  return seal({
    version: 'faction_native_items_envelope_normalization_v1',
    bindingHash: selected.hash,
    inputHash: input.hash,
    providerContractRef: outputContractRef,
    originalOutputHash: hash(value),
    output: normalized.output,
    outputHash: hash(normalized.output),
    originalValidation,
    normalizedValidation: validate(contract.providerSchema, normalized.output),
    movementReceipt: normalized.receipt,
    movedItems: normalized.receipt.moved.length,
    fieldValuesChanged: false,
    originalCandidateBytesPreserved: true,
    originalProviderSchemaPassed: false,
    normalizedProviderSchemaPassed: true,
    freshWholeSectionReviewRequired: true,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}

export function inspectFactionNativeItemsEnvelopeEvidenceV1({ input,
  evidence, binding }) {
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected].forEach(verifySeal);
  const normalized = normalizeFactionNativeItemsEnvelopeV1({ input,
    value: rejected.providerValue, binding });
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
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_ORIGIN_EVIDENCE_INVALID');
  }
  return seal({
    version: 'faction_native_items_envelope_evidence_v1',
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

export function materializeFactionNativeItemsEnvelopeV1({ input, request,
  prepared, evidence, binding, draftEnvelopeBinding }) {
  const inspected = inspectFactionNativeItemsEnvelopeEvidenceV1({ input,
    evidence, binding });
  const { attempt, issue, rejected } = evidence;
  [request.packet, issue, rejected].forEach(verifySeal);
  const invocation = {
    schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
    roleRef: prepared.roleRef,
    contextManifestRef: prepared.contextManifestRef,
    outputContractRef: prepared.outputContractRef,
    executionPolicyRef: prepared.executionPolicyRef,
    continuationRef: null,
    contextPayloadHash: hash({ instructions: prepared.instructions,
      input: prepared.payload }),
    capabilityReceiptHash: inspected.receipt.capabilityReceiptHash,
    trainingTruth: false,
  };
  if (prepared.kind !== 'items'
    || prepared.fullRoleId !== request.packet.id + '.' + request.roleId
    || hash(invocation) !== rejected.invocationHash
    || hash(prepared.outputContractRef) !== hash(outputContractRef)
    || hash(prepared.roleInput.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.roleRef) !== hash(prepared.roleRef)
    || hash(rejected.contextManifestRef) !== hash(prepared.contextManifestRef)) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_EVIDENCE_INVALID');
  }
  let downstreamFailureCode = null;
  try {
    validateFactionDraftBatchV1(inspected.normalized.output, {
      input,
      outline: request.workspace.outline,
      indices: request.workspace.indices,
      completedRecommendations: request.workspace.completedRecommendations,
      draftEnvelopeBinding,
    });
  } catch (error) {
    if (!['FACTION_BATCH_SOURCE_OMISSION',
      'FACTION_BATCH_DUPLICATE_RECOMMENDATION'].includes(error.code)) throw error;
    // Preserve the model output so the existing workflow can observe this
    // exact typed semantic failure and invoke target reconstruction.
    downstreamFailureCode = error.code;
  }
  return seal({
    version: 'faction_native_items_envelope_materialization_v1',
    bindingHash: binding.hash,
    inputHash: input.hash,
    fullRoleId: prepared.fullRoleId,
    roleInputHash: hash(prepared.roleInput),
    originRunId: attempt.run,
    originAttemptId: attempt.id,
    originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash,
    rejectedCandidateHash: rejected.hash,
    originalFailureReceiptHash: inspected.originalFailureReceiptHash,
    normalized: inspected.normalized,
    output: inspected.normalized.output,
    originalUsage: inspected.usage,
    originalSettledMicros: attempt.settled,
    downstreamFailureCode,
    downstreamSemanticRepairRequired: downstreamFailureCode !== null,
    providerCalls: 0,
    fieldValuesChanged: false,
    originalProviderSchemaPassed: false,
    freshWholeSectionReviewRequired: true,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}

export async function recoverFactionNativeItemsEnvelopeV1(args) {
  const materialization = materializeFactionNativeItemsEnvelopeV1(args);
  const { input, prepared, dsh } = args;
  const binding = validateFactionNativeItemsEnvelopeBindingV1(args.binding);
  const command = { action: 'finish', content: materialization.output };
  const loop = await dsh.run({
    task: 'Import the complete source-bound item batch after a lossless Host envelope move; do not rewrite it',
    callModel: async () => ({ command, receiptHash: materialization.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0,
        inputCacheHitUnits: 0, inputCacheMissUnits: 0,
        reasoningOutputUnits: 0 } }),
    toolPort: {
      execute: () => fail('FACTION_NATIVE_ITEMS_ENVELOPE_TOOLS_FORBIDDEN'),
      trace: () => [], readRefs: () => [],
    },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192,
      maxWallMs: 180000 },
  });
  const value = seal({
    roleId: prepared.fullRoleId,
    protocol: binding.version,
    nativeKind: prepared.kind,
    output: materialization.output,
    outputContractRef: prepared.outputContractRef,
    contextManifestRef: prepared.contextManifestRef,
    outputCapacityBindingHash: prepared.roleInput.outputCapacityBindingHash,
    sourceDelivery: 'complete_frozen_sources_and_faction_workspace',
    sourceContextHash: input.frozenSources.hash,
    hostMaterialization: materialization,
    loop,
    structuredDecodePassed: true,
    originalProviderSchemaPassed: false,
    normalizedProviderSchemaPassed: true,
    providerCalls: 0,
    semanticAcceptance: false,
    freshWholeSectionReviewRequired: true,
    toolTrace: [],
    toolReadRefs: [],
    trainingTruth: false,
  });
  verifyFactionNativeItemsEnvelopeRoleV1({ ...args, value,
    dshBindingHash: dsh.binding.hash });
  return value;
}

export function verifyFactionNativeItemsEnvelopeRoleV1({ value,
  dshBindingHash, ...args }) {
  [value, value.loop, value.hostMaterialization].forEach(verifySeal);
  const expected = materializeFactionNativeItemsEnvelopeV1(args);
  const command = { action: 'finish', content: expected.output };
  const loop = value.loop;
  if (value.protocol !== args.binding.version
    || value.hostMaterialization.hash !== expected.hash
    || hash(value.output) !== hash(expected.output)
    || value.roleId !== args.prepared.fullRoleId
    || value.nativeKind !== 'items'
    || value.sourceContextHash !== args.input.frozenSources.hash
    || hash(value.outputContractRef) !== hash(args.prepared.outputContractRef)
    || hash(value.contextManifestRef)
      !== hash(args.prepared.contextManifestRef)
    || value.outputCapacityBindingHash
      !== args.prepared.roleInput.outputCapacityBindingHash
    || value.providerCalls !== 0 || value.semanticAcceptance !== false
    || value.originalProviderSchemaPassed !== false
    || value.normalizedProviderSchemaPassed !== true
    || value.structuredDecodePassed !== true
    || value.trainingTruth !== false || value.toolTrace.length
    || value.toolReadRefs.length || loop.runtimeBinding?.hash !== dshBindingHash
    || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false
    || loop.transcript.length !== 1 || loop.toolTrace.length
    || loop.transcript[0].receiptHash !== expected.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(expected.output)) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_CONSUMER_DRIFT');
  }
  return { providerReceiptHashes: [expected.originalFailureReceiptHash],
    importedCanaryHash: null };
}
