import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1 as binding,
  materializeFactionReviewContractProjectionV1 } from './faction-review-contract-projection-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

export function verifyFactionReviewContractProjectionRoleV1({ value, input, prepared, originalEvidence, repairEvidence = null, dshBindingHash }) {
  verifySeal(value); verifySeal(value.loop);
  const m = materializeFactionReviewContractProjectionV1({ input, prepared, originalEvidence, repairEvidence });
  const loop = value.loop;
  if (value.protocol !== binding.version || value.roleId !== prepared.fullRoleId
    || value.contractProjectionBindingHash !== binding.hash || hash(value.materialization) !== hash(m)
    || hash(value.output) !== hash(m.output) || hash(value.outputContractRef) !== hash(contractRef)
    || value.reviewSlotNamespaceBindingHash !== slotBinding.hash
    || value.initialContextCapsuleHash !== prepared.capsule.hash || value.contextCapsuleHash !== prepared.capsule.hash
    || value.sourceDelivery !== 'proof_carrying_whole_section_review_capsule'
    || value.sharedScenarioSourcesIncluded !== (prepared.capsule.immutableBase.sharedScenarioSourcesIncluded === true)
    || value.structuredDecodePassed !== true || value.originalProviderSchemaPassed !== false
    || value.providerCalls !== 0 || value.semanticAcceptance !== false || value.runtimeAccepted !== false || value.trainingTruth !== false
    || loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.toolTrace.length !== 0
    || loop.transcript.length !== 1 || loop.transcript[0].receiptHash !== m.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify({ action: 'finish', content: m.output }))
    || hash(loop.final) !== hash(m.output)) fail('FACTION_REVIEW_CONTRACT_PROJECTION_CONSUMER_DRIFT');
  return { providerReceiptHashes: [m.originalProof.providerReceiptHash], importedCanaryHash: null, semanticAcceptance: false };
}

export function createFactionReviewContractProjectionRuntimeV1({ input, store, dsh, readEvidence }) {
  if (!dsh || typeof readEvidence !== 'function') fail('FACTION_REVIEW_CONTRACT_PROJECTION_DEPENDENCIES');
  const payment = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  return Object.freeze({ async run(prepared) {
    payment();
    const evidence = await readEvidence(prepared);
    const materialization = materializeFactionReviewContractProjectionV1({ input, prepared, ...evidence });
    const lease = store.acquire(prepared.fullRoleId + '.contract-projection-v1', {
      bindingHash: binding.hash, roleInputHash: hash(prepared.roleInput), materializationHash: materialization.hash });
    if (lease.cached) {
      verifyFactionReviewContractProjectionRoleV1({ value: lease.artifact, input, prepared, ...evidence, dshBindingHash: dsh.binding.hash });
      return verifySeal(lease.artifact);
    }
    try {
      const loop = await dsh.run({ task: 'Materialize the authenticated typed review with Host-owned empty obligations and retained administrative sidecar; never rewrite judgments.',
        callModel: async () => ({ command: { action: 'finish', content: materialization.output }, receiptHash: materialization.hash,
          usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
        toolPort: { execute: () => fail('FACTION_REVIEW_CONTRACT_PROJECTION_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
        limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
      payment();
      const fresh = await readEvidence(prepared);
      const value = seal({ roleId: prepared.fullRoleId, protocol: binding.version,
        contractProjectionBindingHash: binding.hash, reviewSlotNamespaceBindingHash: slotBinding.hash,
        outputContractRef: contractRef, output: materialization.output, materialization, loop,
        initialContextCapsuleHash: prepared.capsule.hash, contextCapsuleHash: prepared.capsule.hash,
        sourceDelivery: 'proof_carrying_whole_section_review_capsule',
        sharedScenarioSourcesIncluded: prepared.capsule.immutableBase.sharedScenarioSourcesIncluded === true,
        structuredDecodePassed: true, originalProviderSchemaPassed: false, providerCalls: 0,
        semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
      verifyFactionReviewContractProjectionRoleV1({ value, input, prepared, ...fresh, dshBindingHash: dsh.binding.hash });
      return store.finish(lease, value);
    } catch (error) { store.release(lease); throw error; }
  } });
}
