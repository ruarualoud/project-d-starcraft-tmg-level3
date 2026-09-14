import { hash, seal, verifySeal, fail } from '../../skill-production/common.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from '../output-contract-registry-v1.mjs';

// Strip only a Markdown opening line from an otherwise COMPLETE JSON object.
// No delimiter insertion, scalar editing, suffix removal or semantic repair.
export function decodeOpeningFenceV1(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 64 * 1024) fail('OPENING_FENCE_NOT_RECOVERABLE');
  const match = /^[ \t\r\n]*```(?:json)?[ \t]*\r?\n/u.exec(text);
  if (!match) fail('OPENING_FENCE_NOT_RECOVERABLE');
  const normalized = text.slice(match[0].length);
  let value;
  try { value = JSON.parse(normalized); } catch { fail('OPENING_FENCE_NOT_RECOVERABLE'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('OPENING_FENCE_NOT_RECOVERABLE');
  return { value, receipt: seal({ version: 'structured_provider_opening_fence_recovery_v1',
    kind: 'opening_fence_only_complete_object', originalTextHash: hash(text), normalizedTextHash: hash(normalized),
    removedPrefixUtf16Length: match[0].length, visibleScalarEdits: 0, appendedCharacters: 0,
    semanticAcceptanceInherited: false, trainingTruth: false }) };
}

function verifyReceipt(value) {
  const { receiptHash, ...body } = value || {};
  if (!receiptHash || hash(body) !== receiptHash) fail('OPENING_FENCE_EVIDENCE_DRIFT');
  return value;
}

export function recoverOpeningFenceResponseV1({ error, wire, providerRequest, outputContract, capabilityReceipt }) {
  if (error?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID') throw error;
  const failure = verifyReceipt(error.safeReceipt);
  if (hash(failure.schemaIssues) !== hash([{ path: '$', code: 'provider_json_not_parseable' }])
    || failure.status !== 200 || !failure.usageKnown || failure.physicalAttempts !== 1) throw error;
  verifySeal(wire);
  const { request, response } = wire, transport = verifyReceipt(response.transportReceipt);
  const contractRef = outputContractRefStarcraftTmgV1(outputContract);
  if (response.status !== 200 || response.payload?.status !== 'completed' || response.physicalAttempts !== 1
    || request.requestId !== providerRequest.requestId || transport.requestId !== providerRequest.requestId
    || hash(request.body) !== transport.requestBodyHash || hash(response.payload) !== transport.payloadHash
    || failure.payloadHash !== transport.payloadHash || failure.capabilityReceiptHash !== capabilityReceipt.receiptHash
    || hash(contractRef) !== hash(failure.outputContractRef) || hash(contractRef) !== hash(transport.outputContractRef)
    || request.body.input !== providerRequest.input || request.body.instructions !== providerRequest.instructions
    || request.body.max_output_tokens !== providerRequest.maxOutputUnits) fail('OPENING_FENCE_EVIDENCE_DRIFT');
  const messages = response.payload.output;
  // Deliberately narrow: one completed assistant text, no refusal/tool output.
  if (!Array.isArray(messages) || messages.length !== 1 || messages[0].type !== 'message'
    || messages[0].role !== 'assistant' || messages[0].content?.length !== 1
    || messages[0].content[0].type !== 'output_text') throw error;
  const text = messages[0].content[0].text;
  if (hash(text) !== failure.outputTextHash) fail('OPENING_FENCE_EVIDENCE_DRIFT');
  let recovered;
  try { recovered = decodeOpeningFenceV1(text); } catch { throw error; }
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(outputContract.providerSchema, recovered.value);
  if (!validation.ok) throw error;
  const body = { schemaVersion: 'structured_provider_opening_fence_recovery_v1.success',
    requestId: providerRequest.requestId, roleRef: providerRequest.roleRef, outputContractRef: contractRef,
    capabilityReceiptHash: capabilityReceipt.receiptHash, originalFailureReceiptHash: failure.receiptHash,
    originalWireHash: wire.hash, transportReceiptHash: transport.receiptHash,
    requestBodyHash: transport.requestBodyHash, requestedModel: transport.requestedModel,
    reportedModel: response.payload.model, startedAt: transport.startedAt,
    responseFingerprint: hash(recovered.value), localSchemaValidationHash: hash(validation),
    responseNormalization: recovered.receipt, usage: failure.usage,
    physicalAttempts: 1, additionalProviderAttempts: 0, automaticRetries: 0,
    semanticAcceptanceInherited: false, trainingTruth: false };
  return { output: recovered.value, usageReceipt: { ...body, receiptHash: hash(body) },
    localValidationReceipt: { schemaVersion: 'structured_provider_opening_fence_recovery_v1.local-validation',
      outputContractRef: contractRef, valueHash: validation.valueHash, schemaHash: validation.schemaHash,
      responseNormalizationHash: recovered.receipt.hash, valid: true, trainingTruth: false } };
}

export function withOpeningFenceRecoveryV1({ adapter, readWire }) {
  return Object.freeze({ ...adapter, async complete(args) {
    try { return await adapter.complete(args); }
    catch (error) {
      if (error?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID') throw error;
      const wire = await readWire(args.providerRequest.requestId);
      if (!wire) throw error;
      return recoverOpeningFenceResponseV1({ ...args, error, wire });
    }
  } });
}
