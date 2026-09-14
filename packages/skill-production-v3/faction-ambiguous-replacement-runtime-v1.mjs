import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 as binding } from './faction-ambiguous-replacement-v1.mjs';
import { openFactionReplacementDispatchGuardV1 } from './faction-replacement-dispatch-guard-v1.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from './faction-review-decomposition-v1.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../structured-generation/structured-runtime-selection-v2.mjs';
import { createStarcraftTmgContextCapsuleRegistryV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1, validateStarcraftTmgProviderJsonSchemaValueV1 as validate }
  from '../structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgStructuredDshModelBridgeV1 } from '../structured-generation/dsh-command-mapper-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../structured-generation/failure-classifier-v2.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';

export const FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1 = 'faction_authorized_replacement_fragment_v1';
const policy = FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy;
const policyRef = { id: 'policy.faction-review-fragment.production', version: 'v1', hash: hash(policy) };
const decode = raw => verifySeal(JSON.parse(raw)).value;
const noTools = { execute: () => fail('FACTION_REPLACEMENT_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] };
const choiceIdentity = q => ({ grantHash: q.grant.hash, requestId: q.request.requestId,
  requestHash: hash(q.request), invocationHash: hash(q.invocation), selectionHash: q.selection.hash,
  capabilityReceiptHash: q.capability.receiptHash });

export function readFactionReplacementDispatchChoiceV1({ filename, grant }) {
  verifySeal(grant);
  const controlRunId = 'faction-replacement-control-' + grant.hash.slice(0, 24);
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(controlRunId)?.recipe !== grant.hash)
      fail('FACTION_REPLACEMENT_ACTUAL_DISPATCH_MISSING');
    const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id='dispatch-choice' AND state='complete'").get(controlRunId);
    if (!row || row.input_hash !== hash({ grantHash: grant.hash })) fail('FACTION_REPLACEMENT_ACTUAL_DISPATCH_MISSING');
    return verifySeal(decode(row.artifact));
  } finally { db.close(); }
}

// The new invocation includes an explicit continuationRef. Never verify it by
// stripping that ref, rewriting a paid receipt or pretending the old send won.
export function verifyFactionReplacementFragmentV1({ part, replacement, authenticateReplacement,
  readSuccessEvidence, readDispatchChoice, readCapabilityReceipt, dshBindingHash }) {
  verifySeal(part);
  const actual = authenticateReplacement();
  const { grant, request, invocation, prepared, plan, capability, egressBinding, selection } = actual;
  if (hash(choiceIdentity(actual)) !== hash(choiceIdentity(replacement)) || grant.bindingHash !== binding.hash)
    fail('FACTION_REPLACEMENT_PREPARATION_DRIFT');
  const choice = readDispatchChoice(grant);
  const cap = readCapabilityReceipt(capability.receiptHash);
  if (!cap || hash(cap) !== hash(capability)
    || hash(Object.fromEntries(Object.keys(choiceIdentity(actual)).map(k => [k, choice[k]]))) !== hash(choiceIdentity(actual)))
    fail('FACTION_REPLACEMENT_ACTUAL_DISPATCH_DRIFT');
  const { attempt, candidate, runtimeReceipt } = readSuccessEvidence({ runId: part.runId, attemptId: part.attemptId });
  [candidate, runtimeReceipt, part.loop].forEach(verifySeal);
  const response = decode(attempt.response), receipt = response.usageReceipt, { receiptHash, ...receiptBody } = receipt || {};
  const wire = { model: egressBinding.model, instructions: request.instructions, input: request.input,
    reasoning: { effort: 'none' }, temperature: egressBinding.temperature, top_p: egressBinding.topP,
    max_output_tokens: policy.maxOutputUnits, stream: false,
    text: { format: { type: 'json_schema', name: prepared.contract.schemaName, schema: prepared.contract.providerSchema } } };
  if (part.protocol !== FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1 || part.bindingHash !== binding.hash
    || part.grantHash !== grant.hash || part.selectionHash !== selection.hash || part.dispatchChoiceHash !== choice.hash
    || part.jobId !== prepared.job.id || part.planHash !== plan.hash || part.contextHash !== prepared.capsule.hash
    || part.outputContractHash !== prepared.contract.contractHash || part.originalAttemptId !== grant.originAttemptId
    || part.originalReserveMicros !== grant.originalReserveMicros || part.originalResultReconciled !== false
    || part.semanticAcceptance !== false || part.trainingTruth !== false
    || attempt.run !== part.runId || attempt.id !== part.attemptId || attempt.id !== request.requestId
    || attempt.request_hash !== hash(request) || attempt.state !== 'received' || attempt.code !== null
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0 || !attempt.usage
    || receiptHash !== hash(receiptBody) || receipt.requestBodyHash !== hash(wire)
    || receipt.requestId !== request.requestId || receipt.capabilityReceiptHash !== capability.receiptHash
    || receipt.requestedModel !== egressBinding.model || receipt.reportedModel !== egressBinding.model
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || hash(receipt.roleRef) !== hash(prepared.roleRef) || hash(receipt.outputContractRef) !== hash(prepared.job.outputContractRef)
    || hash(receipt.usage) !== hash(decode(attempt.usage)) || receipt.responseFingerprint !== hash(candidate.providerValue)
    || hash(response.output) !== hash(candidate.providerValue) || hash(part.value) !== hash(candidate.providerValue)
    || candidate.hash !== part.structuredCandidateRef.hash || candidate.invocationHash !== hash(invocation)
    || candidate.providerReceiptHash !== receiptHash || candidate.contextManifestRef.hash !== prepared.capsule.hash
    || hash(candidate.roleRef) !== hash(prepared.roleRef) || hash(candidate.outputContractRef) !== hash(prepared.job.outputContractRef)
    || candidate.semanticAcceptanceInherited !== false || candidate.published !== false || candidate.runtimeAccepted !== false
    || candidate.trainingTruth !== false || runtimeReceipt.trainingTruth !== false
    || runtimeReceipt.hash !== part.structuredRuntimeReceiptRef.hash || runtimeReceipt.invocationHash !== hash(invocation)
    || runtimeReceipt.candidateHash !== candidate.hash || runtimeReceipt.providerReceiptHash !== receiptHash
    || runtimeReceipt.attemptId !== attempt.id || runtimeReceipt.status !== 'accepted'
    || runtimeReceipt.providerAttempts !== 1 || runtimeReceipt.automaticRetries !== 0 || runtimeReceipt.semanticAcceptance !== false
    || !validate(prepared.contract.providerSchema, part.value).ok)
    fail('FACTION_REPLACEMENT_PAID_PROVENANCE_DRIFT');
  if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: cap, providerProfileRef: egressBinding.providerProfileRef,
    endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
    capability: 'responses_json_schema', outputContractRef: prepared.job.outputContractRef, now: receipt.startedAt }).ok)
    fail('FACTION_REPLACEMENT_PAID_CAPABILITY_DRIFT');
  const loop = part.loop;
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.toolTrace.length !== 0
    || loop.transcript.length !== 1 || loop.transcript[0].receiptHash !== runtimeReceipt.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify({ action: 'finish', content: part.value }))
    || hash(loop.final) !== hash(part.value)) fail('FACTION_REPLACEMENT_DSH_DRIFT');
  return { providerReceiptHash: receiptHash, originalAttemptId: grant.originAttemptId,
    originalResultReconciled: false, semanticAcceptance: false };
}

export function createFactionReplacementFragmentRuntimeV1({ filename, store, dsh, providerAdapter, wireRecovery,
  priceUsage, allowedRunIds, readSuccessEvidence, readCapabilityReceipt, onProgress }) {
  return Object.freeze({ async run({ replacement, authenticateReplacement }) {
    const { prepared, plan, grant, invocation, request, capability, egressBinding, selection } = replacement;
    const guard = openFactionReplacementDispatchGuardV1({ filename, prepared: replacement, store,
      authenticate: authenticateReplacement, allowedRunIds });
    let lease;
    const readDispatchChoice = grant => readFactionReplacementDispatchChoiceV1({ filename, grant });
    const verify = part => verifyFactionReplacementFragmentV1({ part, replacement, authenticateReplacement,
      readSuccessEvidence, readCapabilityReceipt, readDispatchChoice, dshBindingHash: dsh.binding.hash });
    try {
      lease = store.acquire('faction-review-replacement.' + grant.hash, { grantHash: grant.hash,
        invocationHash: hash(invocation), dshBindingHash: dsh.binding.hash }, 1800000);
      if (lease.cached) { const part = verifySeal(lease.artifact); verify(part); return part; }
      let ownerRunId;
      const stepStore = { ...store, reserve(...args) {
        const result = guard.reserve(...args); ownerRunId = result.originRunId; return result;
      } };
      const generated = createStructuredRuntimeWithWireRecoveryV2({ store: stepStore, providerAdapter, wireRecovery,
        egressBinding, priceUsage, classifyFailure: classifyStarcraftTmgStructuredFailureV2,
        outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [prepared.contract] }),
        contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({ entries: [prepared.capsule] }),
        executionPolicyRegistry: { resolve: q => hash(q.executionPolicyRef) === hash(policyRef)
          && hash(q.roleRef) === hash(prepared.roleRef) && hash(q.outputContractRef) === hash(prepared.job.outputContractRef)
          ? { ok: true, executionPolicy: policy } : { ok: false } },
        capabilityReceiptRegistry: { resolve: q => hash(q.providerProfileRef) === hash(egressBinding.providerProfileRef)
          && hash(q.outputContractRef) === hash(prepared.job.outputContractRef) && q.capability === 'responses_json_schema'
          ? { ok: true, capabilityReceipt: capability } : { ok: false } },
        readCandidate: ref => { const c = store.artifact(request.requestId + '.candidate'); return c?.hash === ref.hash ? c : null; } });
      const input = { roleRef: prepared.roleRef, contextManifestRef: invocation.contextManifestRef,
        outputContractRef: prepared.job.outputContractRef, executionPolicyRef: policyRef, continuationRef: invocation.continuationRef };
      let outcome;
      const bridge = createStarcraftTmgStructuredDshModelBridgeV1({ generate: async () => {
        outcome = await generated.generateStructured(input); return outcome;
      }, readCandidate: generated.readCandidate, bindInvocation: () => input });
      const loop = await dsh.run({ task: 'Execute the single authorized replacement for fragment ' + prepared.job.id
        + '. Preserve the full original source context and all unsupported or uncertain judgments; finish once.',
      callModel: bridge.callModel, toolPort: noTools,
      limits: { maxCalls: 1, maxTools: 0, maxOutput: policy.maxOutputUnits, maxWallMs: 180000 } });
      if (outcome?.status !== 'accepted' || !allowedRunIds.includes(ownerRunId)) fail('FACTION_REPLACEMENT_OUTCOME_REJECTED');
      const choice = readDispatchChoice(grant);
      const part = seal({ protocol: FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1, bindingHash: binding.hash,
        jobId: prepared.job.id, planHash: plan.hash, contextHash: prepared.capsule.hash,
        outputContractHash: prepared.contract.contractHash, value: loop.final, runId: ownerRunId, attemptId: request.requestId,
        structuredCandidateRef: outcome.candidateRef, structuredRuntimeReceiptRef: outcome.receiptRef, loop,
        grantHash: grant.hash, selectionHash: selection.hash, dispatchChoiceHash: choice.hash,
        originalAttemptId: grant.originAttemptId, originalReserveMicros: grant.originalReserveMicros,
        originalResultReconciled: false, semanticAcceptance: false, trainingTruth: false });
      verify(part);
      onProgress?.({ stage: 'authorized_replacement_fragment_complete', job: prepared.job.id,
        originalAttemptId: grant.originAttemptId, newAttemptId: request.requestId, originalResultReconciled: false });
      return store.finish(lease, part);
    } catch (error) { if (lease && !lease.cached) store.release(lease); throw error; }
    finally { guard.close(); }
  } });
}
