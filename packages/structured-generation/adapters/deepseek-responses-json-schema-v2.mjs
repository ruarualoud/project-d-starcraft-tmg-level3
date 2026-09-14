import { hash, seal, verifySeal, fail } from '../../skill-production/common.mjs';
import { RAW_QUARANTINE_POLICY_V1 } from '../encrypted-raw-quarantine-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from './deepseek-responses-json-schema-v1.mjs';

export const STRUCTURED_PROVIDER_RAW_CAPTURE_BINDING_V2 = seal({ version: 'structured_provider_raw_capture_v2',
  priorAdapter: 'starcraft_tmg_deepseek_responses_json_schema_adapter_v1',
  policyHash: RAW_QUARANTINE_POLICY_V1.hash, scope: 'complete_unparseable_json_output_text_only',
  oneSendPerInvocation: true, originalErrorAndUsagePreserved: true, noAutomaticRetry: true,
  failureReceiptUnmodified: true, keyIndependentOfByok: true, plaintextLogged: false,
  rawRecoveryIsNotSemanticAcceptance: true, trainingTruth: false });

function validateScope(input, scope) {
  const inv = scope?.invocation, request = input?.providerRequest;
  const fields = ['schemaVersion', 'roleRef', 'contextManifestRef', 'outputContractRef', 'executionPolicyRef',
    'continuationRef', 'contextPayloadHash', 'capabilityReceiptHash', 'trainingTruth'];
  if (!inv || !request || !/^[a-z0-9][a-z0-9._:-]{5,150}$/u.test(scope.runId || '')
    || Object.keys(inv).length !== fields.length || fields.some(k => !Object.hasOwn(inv, k))
    || inv.schemaVersion !== 'starcraft_tmg_structured_generation_runtime_v1.invocation' || inv.trainingTruth !== false
    || !/^[a-f0-9]{64}$/u.test(inv.contextManifestRef?.hash || '')
    || !/^[a-f0-9]{64}$/u.test(inv.executionPolicyRef?.hash || '')
    || request.requestId !== 'structured-' + hash(inv).slice(0, 48)
    || hash(inv.roleRef) !== hash(request.roleRef) || hash(inv.outputContractRef) !== hash(request.outputContractRef)
    || inv.contextPayloadHash !== hash({ instructions: request.instructions, input: request.input })
    || inv.capabilityReceiptHash !== input.capabilityReceipt?.receiptHash)
    fail('RAW_QUARANTINE_INVOCATION_BINDING_INVALID');
  return { runId: scope.runId, invocationHash: hash(inv), attemptId: request.requestId,
    contextHash: inv.contextManifestRef.hash, outputContractHash: inv.outputContractRef.hash,
    providerProfileHash: input.egressBinding.providerProfileRef.hash };
}
function extractBoundRaw(result, receipt) {
  const { receiptHash, ...body } = receipt;
  const messages = result?.payload?.output?.filter?.(m => m?.type === 'message');
  const message = messages?.length === 1 && messages[0];
  const part = message?.content?.length === 1 && message.content[0];
  if (hash(body) !== receiptHash || receipt.status !== 200 || receipt.physicalAttempts !== 1
    || receipt.automaticRetries !== 0 || receipt.usageKnown !== true || receipt.incompleteReason !== null
    || result?.status !== 200 || result?.physicalAttempts !== 1 || result?.payload?.status !== 'completed'
    || message?.role !== 'assistant' || message?.status !== 'completed' || part?.type !== 'output_text'
    || typeof part.text !== 'string' || hash(part.text) !== receipt.outputTextHash
    || hash(result.payload) !== receipt.payloadHash) fail('RAW_QUARANTINE_RESPONSE_BINDING_INVALID');
  return part.text;
}

// V1 is immutable and continues to own capability checks, normalization,
// schema validation and usage. The caller supplies the *actual* runtime
// invocation separately; no model output is allowed to author this binding.
export function createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV2(options = {}) {
  const { quarantine, send } = options;
  if (typeof quarantine?.persist !== 'function' || typeof send !== 'function')
    fail('RAW_QUARANTINE_ADAPTER_DEPENDENCIES_INVALID');
  const legacyOptions = Object.fromEntries(Object.entries(options).filter(([k]) => k !== 'quarantine'));
  const base = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1(legacyOptions);
  async function complete(input, scope) {
    const invocation = validateScope(input, scope);
    let received = null;
    // One closure per invocation prevents parallel faction lanes from ever
    // borrowing each other's response, even when completion order reverses.
    const delegate = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ ...legacyOptions,
      send: async request => { received = await send(request); return received; } });
    try { return await delegate.complete(input); }
    catch (error) {
      const receipt = error.safeReceipt;
      if (error.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        || !receipt?.schemaIssues?.some(i => i.path === '$' && i.code === 'provider_json_not_parseable')) throw error;
      let auxiliary;
      try {
        const text = extractBoundRaw(received, receipt);
        const binding = { ...invocation, failureReceiptHash: receipt.receiptHash, outputTextHash: receipt.outputTextHash };
        const saved = await quarantine.persist({ text, binding }); verifySeal(saved);
        if (saved.version !== 'encrypted_raw_quarantine_receipt_v1' || saved.bindingHash !== hash(binding)
          || saved.payloadHash !== hash(text) || saved.policyHash !== RAW_QUARANTINE_POLICY_V1.hash
          || saved.plaintextPersisted !== false) fail('RAW_QUARANTINE_CAPTURE_RECEIPT_INVALID');
        auxiliary = seal({ version: 'structured_provider_raw_quarantine_evidence_v2',
          captureBindingHash: STRUCTURED_PROVIDER_RAW_CAPTURE_BINDING_V2.hash,
          status: 'persisted', binding, receipt: saved, originalErrorCode: error.code,
          originalFailureReceiptHash: receipt.receiptHash, semanticAcceptance: false, trainingTruth: false });
      } catch (captureError) {
        // A disk/Keychain failure must not erase settled usage or masquerade
        // as a new Provider failure. Only a safe, separate status is attached.
        const code = /^RAW_QUARANTINE_[A-Z_]+$/u.test(captureError?.code || '')
          ? captureError.code : 'RAW_QUARANTINE_PERSIST_FAILED';
        auxiliary = seal({ version: 'structured_provider_raw_quarantine_evidence_v2',
          captureBindingHash: STRUCTURED_PROVIDER_RAW_CAPTURE_BINDING_V2.hash,
          status: 'unavailable', invocation, failureCode: code, originalErrorCode: error.code,
          originalFailureReceiptHash: receipt.receiptHash, semanticAcceptance: false, trainingTruth: false });
      }
      Object.defineProperty(error, 'rawQuarantineEvidence', { value: auxiliary, enumerable: false });
      throw error;
    } finally { received = null; }
  }
  return Object.freeze({ ...base, complete,
    rawCaptureMetadata: () => STRUCTURED_PROVIDER_RAW_CAPTURE_BINDING_V2 });
}
