import { hash, seal, verifySeal, freeze, fail } from '../skill-production/common.mjs';
import { createStarcraftTmgStructuredGenerationRuntimeV1 } from './structured-generation-runtime-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2, STRUCTURED_FAILURE_CLASSIFIER_BINDING_V2 } from './failure-classifier-v2.mjs';
import { STRUCTURED_PROVIDER_RAW_CAPTURE_BINDING_V2 } from './adapters/deepseek-responses-json-schema-v2.mjs';
import { RAW_QUARANTINE_POLICY_V1 } from './encrypted-raw-quarantine-v1.mjs';

export const STRUCTURED_WIRE_RUNTIME_BINDING_V2 = seal({ version: 'structured_wire_runtime_v2',
  legacyRuntimeUnchanged: true, classifierHash: STRUCTURED_FAILURE_CLASSIFIER_BINDING_V2.hash,
  captureBindingHash: STRUCTURED_PROVIDER_RAW_CAPTURE_BINDING_V2.hash, quarantinePolicyHash: RAW_QUARANTINE_POLICY_V1.hash,
  originalFailureAndAccountingImmutable: true, unknownDeliveryNeverReissued: true,
  captureAvailabilityRevalidatedBeforeRepair: true, savedCiphertextNotSemanticAcceptance: true, trainingTruth: false });
const version = STRUCTURED_WIRE_RUNTIME_BINDING_V2.version;
const wireReceipt = r => r?.schemaIssues?.some(i => i.path === '$' && i.code === 'provider_json_not_parseable');
const readValue = raw => verifySeal(JSON.parse(raw)).value;
const safeFailure = e => /^RAW_QUARANTINE_[A-Z_]+$/u.test(e?.code || '') ? e.code
  : e?.code === 'ENOENT' ? 'RAW_QUARANTINE_NOT_FOUND' : 'RAW_QUARANTINE_ACCESS_UNAVAILABLE';

function inspectAttempt({ row, runId, attemptId, invocation, providerRequest }) {
  if (!row || row.run !== runId || row.id !== attemptId || row.request_hash !== hash(providerRequest)
    || row.state !== 'failed' || row.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID')
    fail('STRUCTURED_WIRE_ATTEMPT_BINDING_INVALID');
  const receipt = readValue(row.response), usage = readValue(row.usage);
  const { receiptHash, ...body } = receipt;
  if (hash(body) !== receiptHash || !wireReceipt(receipt) || receipt.status !== 200
    || receipt.usageKnown !== true || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || receipt.incompleteReason !== null || !Number.isSafeInteger(row.settled) || row.settled < 0
    || hash(receipt.usage) !== hash(usage) || receipt.outputContractRef.hash !== invocation.outputContractRef.hash
    || receipt.capabilityReceiptHash !== invocation.capabilityReceiptHash
    || attemptId !== 'structured-' + hash(invocation).slice(0, 48))
    fail('STRUCTURED_WIRE_FAILURE_RECEIPT_INVALID');
  return { receipt, usage, costMicros: row.settled };
}
function usageFor({ usage, costMicros }) {
  const input = usage.inputUnits, output = usage.outputUnits, total = usage.totalUnits;
  const cacheHit = usage.inputCacheHitUnits || 0, cacheMiss = usage.inputCacheMissUnits ?? input - cacheHit;
  return { input, output, total, cacheHit, cacheMiss, estimatedCny: costMicros / 1e6 };
}
function rawBindingFor({ runId, attemptId, invocation, providerProfileHash, receipt }) {
  return { runId, attemptId, invocationHash: hash(invocation), contextHash: invocation.contextManifestRef.hash,
    outputContractHash: invocation.outputContractRef.hash, providerProfileHash,
    failureReceiptHash: receipt.receiptHash, outputTextHash: receipt.outputTextHash };
}

// Successful calls and non-wire failures retain the old protocol. Only a
// confirmed complete wire failure produces a distinct V2 issue/outcome. The
// old stage issue is never overwritten or treated as the current raw status.
export function createStarcraftTmgStructuredGenerationRuntimeV2(options = {}) {
  const { runId, store, quarantine, readAttempt, providerAdapter } = options;
  if (!/^[a-z0-9][a-z0-9._:-]{5,150}$/u.test(runId || '') || typeof readAttempt !== 'function'
    || typeof store?.globalSummary !== 'function'
    || typeof quarantine?.locate !== 'function' || typeof quarantine?.consume !== 'function'
    || providerAdapter?.rawCaptureMetadata?.()?.hash !== STRUCTURED_PROVIDER_RAW_CAPTURE_BINDING_V2.hash)
    fail('STRUCTURED_WIRE_RUNTIME_DEPENDENCIES_INVALID');
  const providerProfileHash = options.egressBinding.providerProfileRef.hash;
  if (store.summary().runId !== runId) fail('STRUCTURED_WIRE_RUNTIME_RUN_MISMATCH');
  const checkPaymentStop = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  const delegated = createStarcraftTmgStructuredGenerationRuntimeV1(options);
  const put = (id, input, value) => {
    const lease = store.acquire(id, input);
    const saved = lease.cached ? verifySeal(lease.artifact) : store.finish(lease, value);
    if (saved.hash !== value.hash) fail('STRUCTURED_WIRE_JOURNAL_DRIFT');
    return saved;
  };
  function validateIssue(issue, state, observed) {
    verifySeal(issue);
    const expectedRawBinding = rawBindingFor({ runId, ...state, providerProfileHash, receipt: observed.receipt });
    if (issue.version !== version + '.issue' || issue.runtimeBindingHash !== STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash
      || issue.invocationHash !== hash(state.invocation) || hash(issue.invocation) !== hash(state.invocation)
      || issue.attemptId !== state.attemptId || issue.runId !== runId || issue.providerProfileHash !== providerProfileHash
      || issue.providerRequestHash !== hash(state.providerRequest)
      || issue.originalProviderReceiptHash !== observed.receipt.receiptHash || issue.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
      || issue.class !== 'wire_syntax' || hash(issue.usage) !== hash(usageFor(observed))
      || issue.automaticRetries !== 0 || issue.maxAdditionalProviderAttempts !== 0 || issue.semanticAcceptance !== false
      || issue.trainingTruth !== false || issue.rawAccessRevalidationRequired !== true
      || typeof issue.rawPayloadPersisted !== 'boolean'
      || hash(issue.rawBinding) !== hash(expectedRawBinding)) fail('STRUCTURED_WIRE_ISSUE_BINDING_INVALID');
    if (issue.rawPayloadPersisted) {
      verifySeal(issue.quarantineReceiptRef);
      if (issue.quarantineReceiptRef.bindingHash !== hash(expectedRawBinding)
        || issue.quarantineReceiptRef.payloadHash !== observed.receipt.outputTextHash
        || issue.quarantineReceiptRef.policyHash !== RAW_QUARANTINE_POLICY_V1.hash
        || issue.retryRoute !== 'authenticated_payload_repair_required') fail('STRUCTURED_WIRE_ISSUE_BINDING_INVALID');
    } else if (issue.quarantineReceiptRef !== null || issue.retryRoute !== 'quarantine_no_raw_recovery')
      fail('STRUCTURED_WIRE_ISSUE_BINDING_INVALID');
  }
  async function finishWire(state) {
    const row = readAttempt(state.attemptId);
    const observed = inspectAttempt({ row, runId, ...state });
    let issue = store.artifact(state.attemptId + '.wire-issue-v2');
    if (issue) validateIssue(issue, state, observed);
    else {
      const rawBinding = rawBindingFor({ runId, ...state, providerProfileHash, receipt: observed.receipt });
      let located = null, unavailable = null;
      try { located = await quarantine.locate(rawBinding); }
      catch (error) { unavailable = safeFailure(error); }
      const legacy = store.artifact(state.attemptId + '.issue');
      issue = seal({ version: version + '.issue', runtimeBindingHash: STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash,
        runId, attemptId: state.attemptId, invocation: state.invocation, invocationHash: hash(state.invocation),
        providerRequestHash: hash(state.providerRequest), providerProfileHash,
        originalProviderReceiptHash: observed.receipt.receiptHash, outputContractRef: state.invocation.outputContractRef,
        supersedesLegacyStageIssueHash: legacy?.hash || null, originalProviderFailurePreserved: true,
        class: 'wire_syntax', code: row.code, rawBinding, rawPayloadPersisted: Boolean(located),
        quarantineReceiptRef: located ? seal({ recordId: located.receipt.recordId, recordHash: located.receipt.recordHash,
          receiptHash: located.receipt.hash, bindingHash: located.receipt.bindingHash,
          payloadHash: located.receipt.payloadHash, policyHash: located.receipt.policyHash,
          expiresAt: located.receipt.expiresAt }) : null,
        accessReceiptHash: located?.accessReceipt.hash || null,
        unavailableCode: unavailable, retryRoute: located ? 'authenticated_payload_repair_required' : 'quarantine_no_raw_recovery',
        rawAccessRevalidationRequired: true, maxAdditionalProviderAttempts: 0, automaticRetries: 0,
        usage: usageFor(observed), semanticAcceptance: false, trainingTruth: false });
      validateIssue(issue, state, observed);
      issue = put(state.attemptId + '.wire-issue-v2', { invocationHash: hash(state.invocation),
        runtimeBindingHash: STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash }, issue);
    }
    const receipt = put(state.attemptId + '.wire-receipt-v2', { issueHash: issue.hash }, seal({
      version: version + '.receipt', runtimeBindingHash: STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash,
      attemptId: state.attemptId, invocationHash: hash(state.invocation), issueHash: issue.hash,
      originalProviderReceiptHash: observed.receipt.receiptHash, status: 'quarantined', candidateHash: null,
      originalProviderAttempts: 1, automaticRetries: 0, acceptanceScope: 'none', trainingTruth: false }));
    const result = freeze({ status: 'quarantined', candidateRef: null,
      issueRef: { id: state.attemptId + '.wire-issue-v2', hash: issue.hash, class: 'wire_syntax', rejectedCandidateRef: null },
      receiptRef: { hash: receipt.hash }, usage: usageFor(observed) });
    const saved = put(state.attemptId + '.wire-outcome-v2', { issueHash: issue.hash, receiptHash: receipt.hash },
      seal({ version: version + '.outcome', invocationHash: hash(state.invocation), result, trainingTruth: false }));
    return saved.result;
  }
  async function generateStructured(input) {
    checkPaymentStop();
    const state = {}, replaySignal = {}; // Per-call closures isolate parallel lanes.
    const contextManifestRegistry = { resolve(q) { state.contextQuery = q;
      return options.contextManifestRegistry.resolve(q); } };
    const executionPolicyRegistry = { resolve(q) { state.policyQuery = q;
      return options.executionPolicyRegistry.resolve(q); } };
    const capabilityReceiptRegistry = { resolve(q) { const r = options.capabilityReceiptRegistry.resolve(q);
      state.capability = r.capabilityReceipt; return r; } };
    const journal = { ...store, reserve(id, request, ...rest) {
      const q = state.contextQuery;
      state.invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
        roleRef: request.roleRef, contextManifestRef: q.contextManifestRef, outputContractRef: request.outputContractRef,
        executionPolicyRef: state.policyQuery.executionPolicyRef, continuationRef: q.continuationRef,
        contextPayloadHash: hash({ instructions: request.instructions, input: request.input }),
        capabilityReceiptHash: state.capability.receiptHash, trainingTruth: false };
      state.attemptId = id; state.providerRequest = request;
      if (id !== 'structured-' + hash(state.invocation).slice(0, 48)) fail('STRUCTURED_WIRE_INVOCATION_DRIFT');
      const existing = readAttempt(id);
      if (existing?.state === 'failed' && existing.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        && wireReceipt(readValue(existing.response))) {
        inspectAttempt({ row: existing, runId, ...state }); throw replaySignal;
      }
      // intent/no-response remains ambiguous and goes through the original
      // store's no-retry stop. A file alone cannot settle an unknown request.
      return store.reserve(id, request, ...rest);
    } };
    const adapter = { ...providerAdapter, complete: request => providerAdapter.complete(request, { runId, invocation: state.invocation }) };
    const runtime = createStarcraftTmgStructuredGenerationRuntimeV1({ ...options, store: journal,
      contextManifestRegistry, executionPolicyRegistry, capabilityReceiptRegistry, providerAdapter: adapter,
      classifyFailure(args) {
        // Native/Teach/editor callers retain their original failure observers
        // and non-wire routing. Only the proven syntax misclassification is
        // replaced; a hidden observer must not disappear during selection.
        const previous = options.classifyFailure(args);
        const current = classifyStarcraftTmgStructuredFailureV2(args);
        return current.class === 'wire_syntax' ? current : previous;
      } });
    try {
      const result = await runtime.generateStructured(input);
      return result.issueRef?.class === 'wire_syntax' ? finishWire(state) : result;
    } catch (error) {
      if (error === replaySignal) return finishWire(state);
      throw error; // Failed journal writes stop; a later exact resume recovers.
    }
  }
  async function consumeWireFailure({ issueRef, contextManifestRef, outputContractRef }, consumer) {
    checkPaymentStop();
    if (!/^structured-[a-f0-9]{48}\.wire-issue-v2$/u.test(issueRef?.id || '')) fail('STRUCTURED_WIRE_ISSUE_REF_INVALID');
    const issue = verifySeal(store.artifact(issueRef.id));
    if (issue.hash !== issueRef.hash || hash(issue.invocation.contextManifestRef) !== hash(contextManifestRef)
      || hash(issue.outputContractRef) !== hash(outputContractRef)) fail('STRUCTURED_WIRE_CONSUMER_SCOPE_INVALID');
    // Reconstruct the actual request from the caller's registered full context.
    const q = { roleRef: issue.invocation.roleRef, contextManifestRef, outputContractRef,
      continuationRef: issue.invocation.continuationRef };
    const context = options.contextManifestRegistry.resolve(q), policy = options.executionPolicyRegistry.resolve({
      executionPolicyRef: issue.invocation.executionPolicyRef, roleRef: q.roleRef, outputContractRef });
    if (!context?.ok || !policy?.ok) fail('STRUCTURED_WIRE_CONSUMER_SCOPE_INVALID');
    const providerRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: issue.attemptId,
      roleRef: q.roleRef, instructions: context.instructions, input: context.input, outputContractRef,
      maxOutputUnits: Number(policy.executionPolicy.maxOutputUnits) };
    const state = { attemptId: issue.attemptId, invocation: issue.invocation, providerRequest };
    const observed = inspectAttempt({ row: readAttempt(issue.attemptId), runId, ...state });
    validateIssue(issue, state, observed);
    if (!issue.rawPayloadPersisted) fail('STRUCTURED_WIRE_RAW_UNAVAILABLE');
    const located = await quarantine.locate(issue.rawBinding, (raw, access, receipt) => {
      if (receipt.hash !== issue.quarantineReceiptRef.receiptHash || receipt.recordHash !== issue.quarantineReceiptRef.recordHash)
        fail('STRUCTURED_WIRE_CONSUMER_RAW_DRIFT');
      return consumer(raw, access);
    });
    return located.value;
  }
  return Object.freeze({ generateStructured, readCandidate: delegated.readCandidate, consumeWireFailure,
    metadata: () => STRUCTURED_WIRE_RUNTIME_BINDING_V2 });
}
