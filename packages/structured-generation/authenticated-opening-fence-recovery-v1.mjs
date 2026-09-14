import { seal, verifySeal, hash, sha256, fail } from '../skill-production/common.mjs';
import { decodeOpeningFenceV1 } from './adapters/opening-fence-recovery-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1, outputContractRefStarcraftTmgV1 } from './output-contract-registry-v1.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from './structured-generation-runtime-v2.mjs';

export const AUTHENTICATED_OPENING_FENCE_RECOVERY_BINDING_V1 = seal({
  version: 'authenticated_opening_fence_recovery_v1', wireRuntimeBindingHash: STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash,
  normalization: 'existing_opening_fence_only_complete_object', duplicateObjectKeysRejected: true,
  maximumRawBytes: 65536, maximumDepth: 128, dshOutputMaximum: 65536,
  authenticatedBytesRequiredOnEveryRecoveryOrReplay: true, expiredRawNeverBypassed: true,
  originalFailedAttemptAndUsageImmutable: true, additionalProviderAttempts: 0,
  acceptanceScope: 'structured_representation_only', semanticAcceptanceInherited: false, trainingTruth: false });
const binding = AUTHENTICATED_OPENING_FENCE_RECOVERY_BINDING_V1;
const invalid = code => fail('AUTHENTICATED_OPENING_FENCE_' + code);

// JSON.parse alone discards repeated keys. Walk an already valid JSON text to
// reject that ambiguity, including escaped spellings of the same object key.
function rejectDuplicateKeys(json) {
  let at = 0;
  const whitespace = () => { while (/\s/u.test(json[at] || '') && at < json.length) at++; };
  const string = () => {
    const start = at++;
    while (at < json.length) {
      const char = json[at++];
      if (char === '\\') at++;
      else if (char === '"') return JSON.parse(json.slice(start, at));
    }
    invalid('JSON_TOKEN_INVALID');
  };
  const value = depth => {
    if (depth > binding.maximumDepth) invalid('JSON_DEPTH_LIMIT');
    whitespace();
    if (json[at] === '{') {
      at++; whitespace(); const keys = new Set();
      if (json[at] === '}') { at++; return; }
      for (;;) {
        whitespace(); if (json[at] !== '"') invalid('JSON_TOKEN_INVALID');
        const key = string();
        if (keys.has(key)) invalid('DUPLICATE_KEY'); keys.add(key);
        whitespace(); if (json[at++] !== ':') invalid('JSON_TOKEN_INVALID');
        value(depth + 1); whitespace();
        const delimiter = json[at++];
        if (delimiter === '}') return;
        if (delimiter !== ',') invalid('JSON_TOKEN_INVALID');
      }
    }
    if (json[at] === '[') {
      at++; whitespace(); if (json[at] === ']') { at++; return; }
      for (;;) {
        value(depth + 1); whitespace(); const delimiter = json[at++];
        if (delimiter === ']') return;
        if (delimiter !== ',') invalid('JSON_TOKEN_INVALID');
      }
    }
    if (json[at] === '"') { string(); return; }
    const literal = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/u.exec(json.slice(at));
    if (!literal) invalid('JSON_TOKEN_INVALID');
    at += literal[0].length;
  };
  value(0); whitespace(); if (at !== json.length) invalid('JSON_TOKEN_INVALID');
}

export async function authenticateOpeningFenceRecoveryV1({ wireRuntime, issue, contract, binding: selected }) {
  [issue, selected].forEach(verifySeal);
  if (selected.hash !== binding.hash || wireRuntime?.metadata?.().hash !== binding.wireRuntimeBindingHash
    || issue.version !== 'structured_wire_runtime_v2.issue' || issue.runtimeBindingHash !== binding.wireRuntimeBindingHash
    || issue.class !== 'wire_syntax' || issue.rawPayloadPersisted !== true
    || issue.semanticAcceptance !== false || issue.trainingTruth !== false
    || hash(issue.outputContractRef) !== hash(outputContractRefStarcraftTmgV1(contract))) invalid('BINDING_INVALID');
  // The V2 deep boundary re-reads the actual failed attempt, reconstructs the
  // complete request from its registry, authenticates ciphertext and expiry,
  // and writes its access receipt BEFORE our consumer sees the bytes.
  return wireRuntime.consumeWireFailure({ issueRef: { id: issue.attemptId + '.wire-issue-v2', hash: issue.hash },
    contextManifestRef: issue.invocation.contextManifestRef, outputContractRef: issue.outputContractRef }, (raw, access) => {
    const text = raw.toString('utf8');
    if (raw.length > binding.maximumRawBytes || hash(text) !== issue.rawBinding.outputTextHash) invalid('RAW_DRIFT');
    const decoded = decodeOpeningFenceV1(text);
    rejectDuplicateKeys(text.slice(decoded.receipt.removedPrefixUtf16Length));
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, decoded.value);
    if (!validation.ok) invalid('SCHEMA_INVALID');
    const proof = seal({ version: binding.version + '.authenticated', bindingHash: binding.hash,
      originRunId: issue.runId, originAttemptId: issue.attemptId, originalWireIssueHash: issue.hash,
      originalProviderReceiptHash: issue.originalProviderReceiptHash, originalRequestHash: issue.providerRequestHash,
      invocation: issue.invocation, originalUsage: issue.usage, contextManifestRef: issue.invocation.contextManifestRef,
      outputContractRef: issue.outputContractRef, providerProfileHash: issue.providerProfileHash,
      quarantineRecordHash: issue.quarantineReceiptRef.recordHash, outputTextHash: issue.rawBinding.outputTextHash,
      normalization: decoded.receipt, providerValue: decoded.value, localValidation: validation,
      additionalProviderAttempts: 0, originalFailurePreserved: true,
      semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
    // Access is audited but its changing UUID/time must not change checkpoint
    // identity. Never persist access.keyRef or a plaintext wire body here.
    return { proof, accessReceiptHash: access.hash };
  });
}

export function verifyOpeningFenceRecoveryRecordV1({ record, authenticated, dshBindingHash }) {
  [record, authenticated].forEach(verifySeal);
  if (authenticated.bindingHash !== binding.hash || record.version !== binding.version + '.record'
    || record.bindingHash !== binding.hash || record.proof.hash !== authenticated.hash
    || hash(record.proof) !== hash(authenticated) || record.additionalProviderAttempts !== 0
    || record.semanticAcceptanceInherited !== false || record.runtimeAccepted !== false || record.trainingTruth !== false)
    invalid('RECORD_DRIFT');
  const loop = verifySeal(record.loop), command = { action: 'finish', content: authenticated.providerValue };
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.toolTrace.length || loop.transcript.length !== 1 || loop.directNetworkUsed !== false
    || loop.transcript[0].call !== 1 || loop.transcript[0].receiptHash !== authenticated.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(authenticated.providerValue) || loop.trainingTruth !== false) invalid('DSH_DRIFT');
  return { providerValue: authenticated.providerValue, originalProviderReceiptHash: authenticated.originalProviderReceiptHash };
}

export async function materializeOpeningFenceRecoveryV1({ authenticate, store, dsh }) {
  if (typeof authenticate !== 'function' || !store?.globalSummary || !dsh?.binding) invalid('DEPENDENCIES_INVALID');
  const stop = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  stop();
  const { proof } = await authenticate(); verifySeal(proof);
  if (proof.bindingHash !== binding.hash) invalid('BINDING_INVALID');
  stop();
  const id = proof.originAttemptId + '.opening-fence-recovery-v1';
  const input = { proofHash: proof.hash, bindingHash: binding.hash, dshBindingHash: dsh.binding.hash };
  const lease = store.acquire(id, input);
  try {
    let record;
    if (lease.cached) record = verifySeal(lease.artifact);
    else {
      const command = { action: 'finish', content: proof.providerValue };
      const loop = await dsh.run({ task: 'Materialize authenticated original response; no new model judgment or Provider request.',
        callModel: async () => { stop(); return { command, receiptHash: proof.hash,
          usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }; },
        toolPort: { execute: () => invalid('TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
        limits: { maxCalls: 1, maxTools: 0, maxOutput: binding.dshOutputMaximum, maxWallMs: 180000 } });
      record = seal({ version: binding.version + '.record', bindingHash: binding.hash, proof, loop,
        additionalProviderAttempts: 0, semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
      verifyOpeningFenceRecoveryRecordV1({ record, authenticated: proof, dshBindingHash: dsh.binding.hash });
      stop(); record = store.finish(lease, record);
    }
    verifyOpeningFenceRecoveryRecordV1({ record, authenticated: proof, dshBindingHash: dsh.binding.hash });
    return { id, input, record, fromCache: lease.cached === true };
  } catch (error) { if (!lease.cached) store.release(lease); throw error; }
}
