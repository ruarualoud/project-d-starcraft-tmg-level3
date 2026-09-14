import { seal, verifySeal, hash, sha256, fail } from '../skill-production/common.mjs';
import { decodeStructuralJsonV1, STRUCTURAL_JSON_RECOVERY_BINDING_V1 } from './adapters/structural-json-recovery-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from './output-contract-registry-v1.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from './structured-generation-runtime-v2.mjs';

export const AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V1 = seal({
  version: 'authenticated_structural_json_recovery_v1',
  wireRuntimeBindingHash: STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash,
  decoderBindingHash: STRUCTURAL_JSON_RECOVERY_BINDING_V1.hash,
  authenticatedBytesRequiredOnEveryRecoveryOrReplay: true, expiredRawNeverBypassed: true,
  originalFailedAttemptAndUsageImmutable: true, additionalProviderAttempts: 0,
  dshOutputMaximum: 65536, acceptanceScope: 'structured_representation_only',
  semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
const binding = AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V1;
const invalid = code => fail('AUTHENTICATED_STRUCTURAL_JSON_' + code);

// The wire runtime reconstructs the complete original request and validates
// the settled owner/receipt/ciphertext/TTL. A saved parsed JSON is not evidence.
export async function authenticateStructuralJsonRecoveryV1({ wireRuntime, issue, contract, binding: selected }) {
  [issue, selected].forEach(verifySeal);
  if (selected.hash !== binding.hash || wireRuntime?.metadata?.().hash !== binding.wireRuntimeBindingHash
    || issue.version !== 'structured_wire_runtime_v2.issue' || issue.runtimeBindingHash !== binding.wireRuntimeBindingHash
    || issue.class !== 'wire_syntax' || issue.rawPayloadPersisted !== true
    || issue.semanticAcceptance !== false || issue.trainingTruth !== false
    || hash(issue.outputContractRef) !== hash(outputContractRefStarcraftTmgV1(contract))) invalid('BINDING_INVALID');
  return wireRuntime.consumeWireFailure({ issueRef: { id: issue.attemptId + '.wire-issue-v2', hash: issue.hash },
    contextManifestRef: issue.invocation.contextManifestRef, outputContractRef: issue.outputContractRef }, (raw, access) => {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw); }
    catch { invalid('UTF8_INVALID'); }
    if (hash(text) !== issue.rawBinding.outputTextHash) invalid('RAW_DRIFT');
    const decoded = decodeStructuralJsonV1(text, contract);
    const proof = seal({ version: binding.version + '.authenticated', bindingHash: binding.hash,
      originRunId: issue.runId, originAttemptId: issue.attemptId, originalWireIssueHash: issue.hash,
      originalProviderReceiptHash: issue.originalProviderReceiptHash, originalRequestHash: issue.providerRequestHash,
      invocation: issue.invocation, originalUsage: issue.usage, contextManifestRef: issue.invocation.contextManifestRef,
      outputContractRef: issue.outputContractRef, providerProfileHash: issue.providerProfileHash,
      quarantineRecordHash: issue.quarantineReceiptRef.recordHash, outputTextHash: issue.rawBinding.outputTextHash,
      normalization: decoded.receipt, providerValue: decoded.value,
      additionalProviderAttempts: 0, originalFailurePreserved: true,
      semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
    return { proof, accessReceiptHash: access.hash };
  });
}

export function verifyStructuralJsonRecoveryRecordV1({ record, authenticated, dshBindingHash }) {
  [record, authenticated].forEach(verifySeal);
  if (authenticated.version !== binding.version + '.authenticated' || authenticated.bindingHash !== binding.hash
    || record.version !== binding.version + '.record' || record.bindingHash !== binding.hash
    || record.proof.hash !== authenticated.hash || hash(record.proof) !== hash(authenticated)
    || record.additionalProviderAttempts !== 0 || record.semanticAcceptanceInherited !== false
    || record.runtimeAccepted !== false || record.trainingTruth !== false) invalid('RECORD_DRIFT');
  const loop = verifySeal(record.loop), command = { action: 'finish', content: authenticated.providerValue };
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.toolTrace.length || loop.transcript.length !== 1 || loop.directNetworkUsed !== false
    || loop.transcript[0].call !== 1 || loop.transcript[0].receiptHash !== authenticated.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(authenticated.providerValue) || loop.trainingTruth !== false) invalid('DSH_DRIFT');
  return { providerValue: authenticated.providerValue, originalProviderReceiptHash: authenticated.originalProviderReceiptHash };
}

export async function materializeStructuralJsonRecoveryV1({ authenticate, store, dsh }) {
  if (typeof authenticate !== 'function' || !store?.globalSummary || !dsh?.binding) invalid('DEPENDENCIES_INVALID');
  const stop = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  stop();
  const { proof } = await authenticate(); verifySeal(proof);
  if (proof.bindingHash !== binding.hash || proof.version !== binding.version + '.authenticated') invalid('BINDING_INVALID');
  stop();
  const id = proof.originAttemptId + '.structural-json-recovery-v1';
  const input = { proofHash: proof.hash, bindingHash: binding.hash, dshBindingHash: dsh.binding.hash };
  const lease = store.acquire(id, input);
  try {
    let record;
    if (lease.cached) record = verifySeal(lease.artifact);
    else {
      const command = { action: 'finish', content: proof.providerValue };
      const loop = await dsh.run({ task: 'Materialize authenticated response after bounded structural JSON repair; no new model judgment or Provider request.',
        callModel: async () => { stop(); return { command, receiptHash: proof.hash,
          usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }; },
        toolPort: { execute: () => invalid('TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
        limits: { maxCalls: 1, maxTools: 0, maxOutput: binding.dshOutputMaximum, maxWallMs: 180000 } });
      record = seal({ version: binding.version + '.record', bindingHash: binding.hash, proof, loop,
        additionalProviderAttempts: 0, semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
      verifyStructuralJsonRecoveryRecordV1({ record, authenticated: proof, dshBindingHash: dsh.binding.hash });
      stop(); record = store.finish(lease, record);
    }
    verifyStructuralJsonRecoveryRecordV1({ record, authenticated: proof, dshBindingHash: dsh.binding.hash });
    return { id, input, record, fromCache: lease.cached === true };
  } catch (error) { if (!lease.cached) store.release(lease); throw error; }
}
