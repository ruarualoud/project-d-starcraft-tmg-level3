import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { validateFactionProposerAuxiliaryCapacityV1 } from './faction-proposer-auxiliary-capacity-v1.mjs';
import { FACTION_PROPOSER_BATCH_CONTRACT_V1 as contract, validateFactionProposerBatchRequestV1,
  validateFactionProposerBatchOutputV1 } from './faction-proposer-batches-v1.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';

const outputContractRef = outputContractRefStarcraftTmgV1(contract);

export function materializeFactionProposerAuxiliaryV1({ input, request, prepared, evidence, auxiliaryCapacityBinding }) {
  const binding = validateFactionProposerAuxiliaryCapacityV1(auxiliaryCapacityBinding);
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected].forEach(verifySeal);
  const original = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, rejected.providerValue);
  if (!original.issues.length || original.issues.some(item =>
    !(item.path === '$.uncertainties' && item.code === 'array_too_long')
    && !(binding.maximumPlanTextLength && /^\$\.plans\[\d+\]\.text$/u.test(item.path) && item.code === 'string_too_long')))
    fail('FACTION_PROPOSER_AUXILIARY_NOT_APPLICABLE');
  const receipt = verifySeal(JSON.parse(attempt.response)).value, usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...receiptBody } = receipt;
  const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
    roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef,
    executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
    contextPayloadHash: hash({ instructions: prepared.instructions, input: prepared.payload }),
    capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
  if (prepared.kind !== 'proposer_batch' || prepared.fullRoleId !== request.packet.id + '.' + request.roleId
    || attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0
    || hash(receiptBody) !== receiptHash || receipt.code !== attempt.code
    || receipt.status !== 200 || receipt.incompleteReason !== null || !receipt.usageKnown
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0 || !receipt.outputTextHash
    || hash(receipt.usage) !== hash(usage) || hash(receipt.schemaIssues) !== hash(original.issues)
    || hash(rejected.validation) !== hash(original) || issue.safeReceiptHash !== receiptHash
    || rejected.safeReceiptHash !== receiptHash || issue.rejectedCandidateRef?.hash !== rejected.hash
    || issue.invocationHash !== rejected.invocationHash || hash(invocation) !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.outputContractRef) !== hash(outputContractRef)
    || hash(prepared.roleInput.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.roleRef) !== hash(prepared.roleInput.roleRef)
    || hash(rejected.contextManifestRef) !== hash(prepared.roleInput.contextManifestRef))
    fail('FACTION_PROPOSER_AUXILIARY_EVIDENCE_INVALID');
  const plan = validateFactionProposerBatchRequestV1({ input, request, auxiliaryCapacityBinding });
  const schema = structuredClone(contract.providerSchema);
  schema.properties.uncertainties.maxItems = binding.maximumUncertainties;
  if (binding.maximumPlanTextLength) schema.properties.plans.items.properties.text.maxLength = binding.maximumPlanTextLength;
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(schema, rejected.providerValue).ok)
    fail('FACTION_PROPOSER_AUXILIARY_HOST_SCHEMA_INVALID');
  const output = validateFactionProposerBatchOutputV1(rejected.providerValue, { input, plan,
    indices: plan.batches[request.workspace.proposerBatch.batchIndex], auxiliaryCapacityBinding });
  return seal({ version: binding.maximumPlanTextLength ? 'faction_proposer_envelope_materialization_v2' : 'faction_proposer_auxiliary_materialization_v1', bindingHash: binding.hash,
    inputHash: input.hash, fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput),
    originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash, rejectedCandidateHash: rejected.hash, originalFailureReceiptHash: receiptHash,
    originalOutputHash: hash(output), output, uncertaintyCount: output.uncertainties.length,
    plansHash: hash(output.plans), uncertaintiesHash: hash(output.uncertainties),
    originalUsage: usage, originalSettledMicros: attempt.settled, originalProviderSchemaPassed: false,
    hostCapacityAndSourceTargetChecksPassed: true, evidenceDropped: false, contentChanged: false,
    providerCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false });
}

export async function recoverFactionProposerAuxiliaryV1(args) {
  const materialization = materializeFactionProposerAuxiliaryV1(args), { input, prepared, dsh } = args;
  const binding = validateFactionProposerAuxiliaryCapacityV1(args.auxiliaryCapacityBinding);
  const command = { action: 'finish', content: materialization.output };
  const loop = await dsh.run({ task: 'Import complete source-bound Proposer plans and every original uncertainty without rewriting',
    callModel: async () => ({ command, receiptHash: materialization.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
    toolPort: { execute: () => fail('FACTION_PROPOSER_AUXILIARY_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 4096, maxWallMs: 180000 } });
  const value = seal({ roleId: prepared.fullRoleId, protocol: binding.version, nativeKind: prepared.kind,
    output: materialization.output, outputContractRef, contextManifestRef: prepared.contextManifestRef,
    proposerBatchBindingHash: prepared.roleInput.proposerBatchBindingHash,
    sourceDelivery: 'complete_frozen_sources_and_faction_workspace', sourceContextHash: input.frozenSources.hash,
    hostMaterialization: materialization, loop, structuredDecodePassed: true, originalProviderSchemaPassed: false,
    providerCalls: 0, semanticAcceptance: false, toolTrace: [], toolReadRefs: [], trainingTruth: false });
  verifyFactionProposerAuxiliaryRoleV1({ ...args, value, dshBindingHash: dsh.binding.hash });
  return value;
}

export function verifyFactionProposerAuxiliaryRoleV1({ value, dshBindingHash, ...args }) {
  verifySeal(value); verifySeal(value.loop); verifySeal(value.hostMaterialization);
  const materialization = materializeFactionProposerAuxiliaryV1(args), loop = value.loop;
  const binding = validateFactionProposerAuxiliaryCapacityV1(args.auxiliaryCapacityBinding);
  const command = { action: 'finish', content: materialization.output };
  if (value.protocol !== binding.version || value.hostMaterialization.hash !== materialization.hash
    || hash(value.output) !== materialization.originalOutputHash || value.nativeKind !== 'proposer_batch'
    || value.roleId !== args.prepared.fullRoleId || value.sourceContextHash !== args.input.frozenSources.hash
    || hash(value.contextManifestRef) !== hash(args.prepared.contextManifestRef)
    || hash(value.outputContractRef) !== hash(outputContractRef)
    || value.proposerBatchBindingHash !== args.prepared.roleInput.proposerBatchBindingHash
    || value.providerCalls !== 0 || value.semanticAcceptance !== false || value.originalProviderSchemaPassed !== false
    || value.structuredDecodePassed !== true || value.trainingTruth !== false || value.toolTrace.length || value.toolReadRefs.length
    || loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.transcript.length !== 1
    || loop.toolTrace.length || loop.transcript[0].receiptHash !== materialization.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== materialization.originalOutputHash) fail('FACTION_PROPOSER_AUXILIARY_CONSUMER_DRIFT');
  return { providerReceiptHashes: [materialization.originalFailureReceiptHash], importedCanaryHash: null };
}
