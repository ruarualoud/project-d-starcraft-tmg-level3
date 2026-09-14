import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from '../structured-generation/structured-generation-runtime-v2.mjs';

// A durable capture receipt proves storage was performed, not that decryption
// will succeed now. The next action is authenticated lookup, never a resend.
export function observeFactionStructuredWireFailureV1({ issue, attempt, receipt }, now = Date.now()) {
  if (issue.version !== 'structured_wire_runtime_v2.issue') return null;
  verifySeal(issue);
  if (issue.runtimeBindingHash !== STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash || issue.class !== 'wire_syntax'
    || issue.runId !== attempt.run || issue.attemptId !== attempt.id || issue.providerRequestHash !== attempt.request_hash
    || issue.originalProviderReceiptHash !== receipt.receiptHash || issue.invocationHash !== hash(issue.invocation)
    || issue.rawBinding.failureReceiptHash !== receipt.receiptHash || issue.rawBinding.outputTextHash !== receipt.outputTextHash
    || issue.rawBinding.contextHash !== issue.invocation.contextManifestRef.hash || issue.trainingTruth !== false
    || issue.maxAdditionalProviderAttempts !== 0) fail('FACTION_WIRE_OBSERVATION_EVIDENCE_INVALID');
  let expired = false;
  if (issue.rawPayloadPersisted) {
    const r = verifySeal(issue.quarantineReceiptRef);
    if (r.bindingHash !== hash(issue.rawBinding) || r.payloadHash !== receipt.outputTextHash
      || !Number.isFinite(Date.parse(r.expiresAt))) fail('FACTION_WIRE_OBSERVATION_CAPTURE_INVALID');
    expired = now >= Date.parse(r.expiresAt);
  }
  return seal({ version: 'faction_wire_capture_observation_v1', issueHash: issue.hash,
    rawPayloadPersisted: issue.rawPayloadPersisted === true, captureReceiptHash: issue.quarantineReceiptRef?.receiptHash || null,
    expiresAt: issue.quarantineReceiptRef?.expiresAt || null, expired,
    retryRoute: !issue.rawPayloadPersisted ? 'quarantine_no_raw_recovery'
      : expired ? 'quarantine_raw_expired' : 'authenticated_payload_repair_required',
    rawAccessRevalidationRequired: true, decryptedNow: false, maxAdditionalProviderAttempts: 0,
    semanticAcceptance: false, trainingTruth: false });
}
