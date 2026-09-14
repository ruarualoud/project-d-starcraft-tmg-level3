import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { materializeFactionOutlineCapacityV1,
  validateFactionOutlineCapacityBindingV1 } from './faction-outline-capacity-envelope-v1.mjs';

export async function recoverFactionOutlineCapacityV1(args) {
  const materialization = materializeFactionOutlineCapacityV1(args);
  const { input, prepared, dsh } = args;
  const binding = validateFactionOutlineCapacityBindingV1(args.binding);
  const command = { action: 'finish', content: materialization.output };
  const loop = await dsh.run({
    task: 'Import the complete source-bound outline exactly; do not rewrite or regenerate it',
    callModel: async () => ({
      command,
      receiptHash: materialization.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0,
        inputCacheHitUnits: 0, inputCacheMissUnits: 0,
        reasoningOutputUnits: 0 },
    }),
    toolPort: {
      execute: () => fail('FACTION_OUTLINE_CAPACITY_TOOLS_FORBIDDEN'),
      trace: () => [],
      readRefs: () => [],
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
    hostCapacitySchemaPassed: true,
    providerCalls: 0,
    semanticAcceptance: false,
    freshSourceAndSemanticReviewRequired: true,
    toolTrace: [],
    toolReadRefs: [],
    trainingTruth: false,
  });
  verifyFactionOutlineCapacityRoleV1({ ...args, value,
    dshBindingHash: dsh.binding.hash });
  return value;
}

export function verifyFactionOutlineCapacityRoleV1({ value, dshBindingHash,
  ...args }) {
  verifySeal(value); verifySeal(value.loop); verifySeal(value.hostMaterialization);
  const materialization = materializeFactionOutlineCapacityV1(args);
  const binding = validateFactionOutlineCapacityBindingV1(args.binding);
  const loop = value.loop;
  const command = { action: 'finish', content: materialization.output };
  if (value.protocol !== binding.version
    || value.hostMaterialization.hash !== materialization.hash
    || hash(value.output) !== materialization.normalized.originalOutputHash
    || value.nativeKind !== 'outline'
    || value.roleId !== args.prepared.fullRoleId
    || value.sourceContextHash !== args.input.frozenSources.hash
    || hash(value.contextManifestRef) !== hash(args.prepared.contextManifestRef)
    || hash(value.outputContractRef) !== hash(args.prepared.outputContractRef)
    || value.outputCapacityBindingHash
      !== args.prepared.roleInput.outputCapacityBindingHash
    || value.providerCalls !== 0 || value.semanticAcceptance !== false
    || value.originalProviderSchemaPassed !== false
    || value.hostCapacitySchemaPassed !== true
    || value.structuredDecodePassed !== true
    || value.trainingTruth !== false || value.toolTrace.length
    || value.toolReadRefs.length || loop.runtimeBinding?.hash !== dshBindingHash
    || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false
    || loop.transcript.length !== 1 || loop.toolTrace.length
    || loop.transcript[0].receiptHash !== materialization.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== materialization.normalized.originalOutputHash) {
    fail('FACTION_OUTLINE_CAPACITY_CONSUMER_DRIFT');
  }
  return { providerReceiptHashes: [materialization.originalFailureReceiptHash],
    importedCanaryHash: null };
}
