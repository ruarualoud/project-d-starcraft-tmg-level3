import { seal, verifySeal, hash, sha256, fail } from '../skill-production/common.mjs';
import { materializeFactionDraftEnvelopeV2, validateFactionDraftEnvelopeBindingV2 } from './faction-draft-envelope-v2.mjs';
import { validateFactionDraftBatchV1 } from './faction-strategy-workflow-v1.mjs';

function materialize(args) {
  const materialization = materializeFactionDraftEnvelopeV2(args);
  const { input, request, prepared, binding } = args;
  if (request.packet.id + '.' + request.roleId !== prepared.fullRoleId)
    fail('FACTION_DRAFT_ENVELOPE_REQUEST_SCOPE_DRIFT');
  validateFactionDraftBatchV1(materialization.output, { input, outline: request.workspace.outline,
    indices: request.workspace.indices, completedRecommendations: request.workspace.completedRecommendations,
    draftEnvelopeBinding: binding });
  return materialization;
}

export async function recoverFactionDraftEnvelopeV2(args) {
  const result = materialize(args), { input, prepared, binding, dsh } = args;
  validateFactionDraftEnvelopeBindingV2(binding);
  const command = { action: 'finish', content: result.output };
  const loop = await dsh.run({ task: 'Import complete source-bound advice without deleting citations or inventing uncertainty prose',
    callModel: async () => ({ command, receiptHash: result.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
    toolPort: { execute: () => fail('FACTION_DRAFT_ENVELOPE_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
  const value = seal({ roleId: prepared.fullRoleId, protocol: binding.version, nativeKind: prepared.kind,
    output: result.output, outputContractRef: prepared.outputContractRef, contextManifestRef: prepared.contextManifestRef,
    sourceDelivery: 'complete_frozen_sources_and_faction_workspace', sourceContextHash: input.frozenSources.hash,
    hostMaterialization: result, loop, structuredDecodePassed: true, originalProviderSchemaPassed: false,
    providerCalls: 0, semanticAcceptance: false, toolTrace: [], toolReadRefs: [], trainingTruth: false });
  verifyFactionDraftEnvelopeRoleV2({ ...args, value, dshBindingHash: dsh.binding.hash });
  return value;
}

export function verifyFactionDraftEnvelopeRoleV2({ value, dshBindingHash, ...args }) {
  [value, value.loop, value.hostMaterialization].forEach(verifySeal);
  const expected = materialize(args), loop = value.loop;
  const command = { action: 'finish', content: expected.output };
  if (value.protocol !== args.binding.version || value.hostMaterialization.hash !== expected.hash
    || hash(value.output) !== hash(expected.output) || value.roleId !== args.prepared.fullRoleId || value.nativeKind !== 'items'
    || value.sourceContextHash !== args.input.frozenSources.hash || value.structuredDecodePassed !== true
    || hash(value.outputContractRef) !== hash(args.prepared.outputContractRef)
    || hash(value.contextManifestRef) !== hash(args.prepared.contextManifestRef)
    || value.originalProviderSchemaPassed !== false || value.semanticAcceptance !== false || value.providerCalls !== 0
    || value.trainingTruth !== false || value.toolTrace.length || value.toolReadRefs.length
    || loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.transcript.length !== 1
    || loop.toolTrace.length || loop.transcript[0].receiptHash !== expected.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command)) || hash(loop.final) !== hash(expected.output))
    fail('FACTION_DRAFT_ENVELOPE_CONSUMER_DRIFT');
  return { providerReceiptHashes: [expected.originalFailureReceiptHash], importedCanaryHash: null };
}
