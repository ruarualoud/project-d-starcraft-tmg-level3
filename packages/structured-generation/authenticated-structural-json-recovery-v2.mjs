import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { decodeStructuralJsonV2, STRUCTURAL_JSON_RECOVERY_BINDING_V2 } from './adapters/structural-json-recovery-v2.mjs';
import { outputContractRefStarcraftTmgV1 } from './output-contract-registry-v1.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from './structured-generation-runtime-v2.mjs';

export const AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 = seal({
  version: 'authenticated_structural_json_recovery_v2',
  wireRuntimeBindingHash: STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash,
  decoderBindingHash: STRUCTURAL_JSON_RECOVERY_BINDING_V2.hash,
  authenticatedBytesRequiredOnEveryRecoveryOrReplay: true, expiredRawNeverBypassed: true,
  originalFailedAttemptAndUsageImmutable: true, additionalProviderAttempts: 0,
  schemaFailureRequiresSeparateCorrection: true, acceptanceScope: 'parsed_representation_only',
  semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
const binding = AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2;
const invalid = code => fail('AUTHENTICATED_STRUCTURAL_JSON_V2_' + code);

// The supplied wire runtime independently reconstructs the original request,
// authenticates paid owner/receipt/ciphertext and enforces TTL on EVERY read.
// This returns a parsed candidate, never a fabricated native-success receipt.
export async function authenticateStructuralJsonRecoveryV2({ wireRuntime, issue, contract, binding: selected }) {
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
    const decoded = decodeStructuralJsonV2(text, contract);
    const proof = seal({ version: binding.version + '.authenticated', bindingHash: binding.hash,
      originRunId: issue.runId, originAttemptId: issue.attemptId, originalWireIssueHash: issue.hash,
      originalProviderReceiptHash: issue.originalProviderReceiptHash, originalRequestHash: issue.providerRequestHash,
      invocation: issue.invocation, originalUsage: issue.usage, contextManifestRef: issue.invocation.contextManifestRef,
      outputContractRef: issue.outputContractRef, providerProfileHash: issue.providerProfileHash,
      quarantineRecordHash: issue.quarantineReceiptRef.recordHash, outputTextHash: issue.rawBinding.outputTextHash,
      normalization: decoded.receipt, providerValue: decoded.value, validation: decoded.validation,
      additionalProviderAttempts: 0, originalFailurePreserved: true, nativeSuccessReceiptInvented: false,
      semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
    return { proof, accessReceiptHash: access.hash };
  });
}
