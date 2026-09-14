import { seal, verifySeal, hash, sha256, fail } from '../skill-production/common.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract } from '../../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftBinding } from './faction-draft-envelope-v2.mjs';
import { validateFactionDraftV1 } from './faction-strategy-workflow-v1.mjs';

export const FACTION_EDITOR_ENVELOPE_EXECUTION_POLICY_V2 = Object.freeze({ maxOutputUnits: 2048,
  attemptEstimateMicros: 500000, attemptTokenReserve: 90000, allowDefinitelyNotSentRetry: false,
  allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false });
export const FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2 = seal({ version: 'faction_editor_draft_envelope_v2',
  executionPolicyHash: hash(FACTION_EDITOR_ENVELOPE_EXECUTION_POLICY_V2),
  providerContractRef: outputContractRefStarcraftTmgV1(contract), draftEnvelopeBindingHash: draftBinding.hash,
  acceptedPaths: ['$.sourceRefs', '$.unproven'], maximumDistinctKnownSourceRefs: 128,
  minimumUnprovenItems: 0, originalProviderSchemaUnchanged: true, substantiveTextChanged: false,
  preserveOriginalFailureAndUsage: true, automaticProviderRetries: 0,
  emptyUnprovenMeaning: 'model_reported_none_not_evidence_of_no_uncertainty',
  freshWholeSectionReviewRequired: true, independentEvaluationRequired: true,
  semanticAcceptanceInherited: false, canAffectRules: false, trainingTruth: false });

export function validateFactionEditorDraftEnvelopeBindingV2(binding, hostBinding) {
  if (verifySeal(binding).hash !== FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2.hash
    || verifySeal(hostBinding).hash !== draftBinding.hash) fail('FACTION_EDITOR_ENVELOPE_BINDING_INVALID');
}

export function normalizeFactionEditorDraftEnvelopeV2({ input, value, binding, draftEnvelopeBinding }) {
  verifySeal(input); validateFactionEditorDraftEnvelopeBindingV2(binding, draftEnvelopeBinding);
  const originalValidation = validate(contract.providerSchema, value);
  if (!originalValidation.issues.length || !originalValidation.issues.every(i =>
    i.path === '$.sourceRefs' && ['array_too_long', 'array_items_not_unique'].includes(i.code)
    || i.path === '$.unproven' && i.code === 'array_too_short' && i.actualItems === 0))
    fail('FACTION_EDITOR_ENVELOPE_NOT_APPLICABLE');
  const known = new Set(input.frozenSources.prompt.sources.map(s => s.ref));
  if (value.sourceRefs.some(ref => !known.has(ref))) fail('FACTION_EDITOR_ENVELOPE_UNKNOWN_SOURCE');
  const output = structuredClone(value), original = output.sourceRefs;
  output.sourceRefs = [...new Set(original)];
  const hostSchema = structuredClone(contract.providerSchema);
  hostSchema.properties.sourceRefs.maxItems = binding.maximumDistinctKnownSourceRefs;
  hostSchema.properties.unproven.minItems = binding.minimumUnprovenItems;
  const hostValidation = validate(hostSchema, output);
  if (!hostValidation.ok) fail('FACTION_EDITOR_ENVELOPE_HOST_SCHEMA_INVALID');
  validateFactionDraftV1({ recommendations: [output] }, input, { draftEnvelopeBinding });
  return seal({ version: 'faction_editor_draft_envelope_normalization_v2', bindingHash: binding.hash,
    inputHash: input.hash, originalOutputHash: hash(value), output, outputHash: hash(output),
    originalValidation, hostValidation, hostSchemaHash: hash(hostSchema),
    removedDuplicateReferenceIndices: original.flatMap((ref, n) => original.indexOf(ref) === n ? [] : [n]),
    allDistinctReferencesPreserved: true, substantiveTextChanged: false,
    emptyUnprovenAcceptedAsProof: false, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function materializeFactionEditorDraftEnvelopeV2(args) {
  const { input, request, prepared, evidence, binding } = args;
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected].forEach(verifySeal);
  const normalized = normalizeFactionEditorDraftEnvelopeV2({ ...args, value: rejected.providerValue });
  const receipt = verifySeal(JSON.parse(attempt.response)).value, usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...body } = receipt;
  const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
    roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef: prepared.outputContractRef,
    executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
    contextPayloadHash: hash({ instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput }),
    capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
  if (prepared.fullRoleId !== request.packet.id + '.' + request.roleId
    || request.packet.inputHash !== input.hash || request.workspace.inputHash !== input.hash
    || request.workspace.parentHash !== hash(request.workspace.draft)
    || hash(prepared.outputContractRef) !== hash(binding.providerContractRef)
    || prepared.executionPolicyRef.hash !== binding.executionPolicyHash
    || attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
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
    fail('FACTION_EDITOR_ENVELOPE_EVIDENCE_INVALID');
  return seal({ version: 'faction_editor_draft_envelope_materialization_v2', bindingHash: binding.hash,
    inputHash: input.hash, fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput),
    originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash, rejectedCandidateHash: rejected.hash, originalFailureReceiptHash: receiptHash,
    contextCapsuleHash: prepared.capsule.hash, normalized, output: normalized.output,
    originalUsage: usage, originalSettledMicros: attempt.settled, providerCalls: 0,
    originalProviderSchemaPassed: false, semanticAcceptanceInherited: false,
    freshWholeSectionReviewRequired: true, trainingTruth: false });
}

export async function recoverFactionEditorDraftEnvelopeV2(args) {
  const result = materializeFactionEditorDraftEnvelopeV2(args), { prepared, binding, dsh } = args;
  const command = { action: 'finish', content: result.output };
  const loop = await dsh.run({ task: 'Import the complete source-bound local edit without removing citations or inventing uncertainty text',
    callModel: async () => ({ command, receiptHash: result.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
    toolPort: { execute: () => fail('FACTION_EDITOR_ENVELOPE_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
  const value = seal({ roleId: prepared.fullRoleId, protocol: binding.version,
    output: result.output, outputContractRef: prepared.outputContractRef, contextCapsuleHash: prepared.capsule.hash,
    sourceDelivery: 'proof_carrying_local_capsule', sourceInputHash: args.input.hash,
    hostMaterialization: result, loop, structuredDecodePassed: true, originalProviderSchemaPassed: false,
    providerCalls: 0, semanticAcceptance: false, freshWholeSectionReviewRequired: true,
    toolTrace: [], toolReadRefs: [], trainingTruth: false });
  verifyFactionEditorDraftEnvelopeRoleV2({ ...args, value, dshBindingHash: dsh.binding.hash });
  return value;
}

export function verifyFactionEditorDraftEnvelopeRoleV2({ value, dshBindingHash, ...args }) {
  [value, value.loop, value.hostMaterialization].forEach(verifySeal);
  const expected = materializeFactionEditorDraftEnvelopeV2(args), loop = value.loop;
  const command = { action: 'finish', content: expected.output };
  if (value.protocol !== args.binding.version || value.hostMaterialization.hash !== expected.hash
    || hash(value.output) !== hash(expected.output) || value.roleId !== args.prepared.fullRoleId
    || value.sourceInputHash !== args.input.hash || value.structuredDecodePassed !== true
    || hash(value.outputContractRef) !== hash(args.prepared.outputContractRef)
    || value.contextCapsuleHash !== args.prepared.capsule.hash
    || value.originalProviderSchemaPassed !== false || value.semanticAcceptance !== false || value.providerCalls !== 0
    || value.trainingTruth !== false || value.freshWholeSectionReviewRequired !== true || value.toolTrace.length || value.toolReadRefs.length
    || loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.transcript.length !== 1
    || loop.toolTrace.length || loop.transcript[0].receiptHash !== expected.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command)) || hash(loop.final) !== hash(expected.output))
    fail('FACTION_EDITOR_ENVELOPE_CONSUMER_DRIFT');
  return { providerReceiptHashes: [expected.originalFailureReceiptHash], importedCanaryHash: null };
}
