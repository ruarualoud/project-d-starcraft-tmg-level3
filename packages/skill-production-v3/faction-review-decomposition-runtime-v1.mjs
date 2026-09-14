import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  assembleFactionReviewFragmentsV1, FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as binding } from './faction-review-decomposition-v1.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../structured-generation/structured-runtime-selection-v2.mjs';
import { createStarcraftTmgContextCapsuleRegistryV1, contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1, outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgStructuredDshModelBridgeV1 } from '../structured-generation/dsh-command-mapper-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../structured-generation/failure-classifier-v2.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { openingFenceForFactionFragmentV1, materializeOpeningFenceFactionFragmentV1,
  verifyOpeningFenceFactionFragmentV1, FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1 } from './faction-fragment-opening-fence-v1.mjs';

const policy = binding.executionPolicy;
const policyRef = { id: 'policy.faction-review-fragment.production', version: 'v1', hash: hash(policy) };
function invocationFor(prepared, capability) {
  return { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation', roleRef: prepared.roleRef,
    contextManifestRef: contextManifestRefStarcraftTmgV1(prepared.capsule), outputContractRef: outputContractRefStarcraftTmgV1(prepared.contract),
    executionPolicyRef: policyRef, continuationRef: null,
    contextPayloadHash: hash({ instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput }),
    capabilityReceiptHash: capability.receiptHash, trainingTruth: false };
}
function providerRequestFor(prepared, invocation) {
  return { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: 'structured-' + hash(invocation).slice(0, 48),
    roleRef: prepared.roleRef, instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput,
    outputContractRef: prepared.job.outputContractRef, maxOutputUnits: policy.maxOutputUnits };
}
export function factionReviewFragmentLeaseInputV1({ prepared, capability, plan, dshBindingHash, openingFenceRecovery }) {
  const recovered = openingFenceForFactionFragmentV1({ prepared, recovery: openingFenceRecovery });
  return { planHash: plan.hash, invocationHash: hash(invocationFor(prepared, recovered?.capability || capability)), dshBindingHash,
    ...(recovered ? { openingFenceProofHash: recovered.proof.hash } : {}) };
}
function checkCapability(capability, prepared, egressBinding, now) {
  if (!capability || !verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: capability,
    providerProfileRef: egressBinding.providerProfileRef, endpointPath: egressBinding.endpoint.path,
    endpointDialect: egressBinding.endpointDialect, model: egressBinding.model, capability: 'responses_json_schema',
    outputContractRef: prepared.job.outputContractRef, now }).ok) fail('FACTION_REVIEW_FRAGMENT_CAPABILITY_REQUIRED');
}
const parentId = plan => 'faction-review-decomposition.' + plan.hash;

// A scheduler-owned bounded DAG: all child tasks retain the complete input,
// have independent durable leases/attempts, and do not publish an assembly until
// all targets and coverage rows exist. No sub-agent or online DSH is involved.
export function createFactionReviewDecompositionRuntimeV1(options) {
  const { store, dsh, egressBinding, capabilities, providerAdapter, wireRecovery, priceUsage, readOrigin,
    readSuccessEvidence, openingFenceRecovery } = options;
  if (!wireRecovery || !store?.globalSummary || !dsh?.binding || typeof readOrigin !== 'function'
    || typeof readSuccessEvidence !== 'function') fail('FACTION_REVIEW_FRAGMENT_RUNTIME_DEPENDENCIES');
  const checkStop = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  return Object.freeze({ async run(args) {
    checkStop();
    if (readOrigin(args).hash !== args.evidence.hash) fail('FACTION_REVIEW_DECOMPOSITION_ORIGIN_DRIFT');
    const plan = prepareFactionReviewDecompositionV1(args);
    const preparations = plan.jobs.map(job => createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id }));
    const recoveries = new Map();
    for (const p of preparations) {
      const recovered = openingFenceForFactionFragmentV1({ prepared: p, recovery: openingFenceRecovery });
      if (!recovered) continue;
      const fresh = await openingFenceRecovery.authenticate(recovered.proof);
      if (verifySeal(fresh.proof).hash !== recovered.proof.hash) fail('FACTION_FRAGMENT_OPENING_FENCE_BINDING_DRIFT');
      recoveries.set(p.job.id, recovered);
    }
    // Fail before *any* send when even one required schema capability is missing.
    for (const p of preparations) if (!recoveries.has(p.job.id))
      checkCapability(capabilities[p.job.kind], p, egressBinding, (options.now || (() => new Date().toISOString()))());
    const roleInput = { planHash: plan.hash, bindingHash: binding.hash, dshBindingHash: dsh.binding.hash,
      providerProfileRef: egressBinding.providerProfileRef, capabilities: Object.fromEntries(preparations.map(p =>
        [p.job.kind, capabilities[p.job.kind].receiptHash])),
      ...(recoveries.size ? { openingFenceProofHashes: [...recoveries.values()].map(r => r.proof.hash) } : {}) };
    const lease = store.acquire(parentId(plan), roleInput);
    try {
      if (lease.cached) {
        const value = verifySeal(lease.artifact);
        // The immutable continuation adapter materializes an inherited child
        // only at acquire(), not artifact(). Hydrate each exact child before
        // independently validating a cached parent assembly.
        for (const p of preparations) {
          const child = store.acquire(parentId(plan) + '.' + p.job.id, factionReviewFragmentLeaseInputV1({
            prepared: p, capability: capabilities[p.job.kind], plan, dshBindingHash: dsh.binding.hash, openingFenceRecovery }));
          if (!child.cached) { store.release(child); fail('FACTION_REVIEW_FRAGMENT_CACHED_PARENT_CHILD_MISSING'); }
        }
        verifyFactionReviewDecompositionRuntimeV1({ ...args, value, egressBinding, capabilities, dshBindingHash: dsh.binding.hash,
          resolveFragment: id => store.artifact(id), readSuccessEvidence, openingFenceRecovery });
        return value;
      }
      const parts = [];
      for (const p of preparations) {
        checkStop();
        if (readOrigin(args).hash !== args.evidence.hash) fail('FACTION_REVIEW_DECOMPOSITION_ORIGIN_DRIFT');
        const recovered = recoveries.get(p.job.id);
        const capability = recovered?.capability || capabilities[p.job.kind], invocation = invocationFor(p, capability);
        const attemptId = 'structured-' + hash(invocation).slice(0, 48);
        const partId = parentId(plan) + '.' + p.job.id;
        const partLease = store.acquire(partId, factionReviewFragmentLeaseInputV1({ prepared: p, capability, plan, dshBindingHash: dsh.binding.hash, openingFenceRecovery }));
        let part;
        try {
          if (partLease.cached) part = verifySeal(partLease.artifact);
          else if (recovered) {
            part = await materializeOpeningFenceFactionFragmentV1({ prepared: p, plan, origin: recovered,
              recovery: openingFenceRecovery, store, dsh });
            verifyFactionReviewFragmentRuntimeV1({ ...args, plan, part, prepared: p, egressBinding,
              capability, dshBindingHash: dsh.binding.hash, readSuccessEvidence, openingFenceRecovery });
            part = store.finish(partLease, part);
          }
          else {
            const generated = createStructuredRuntimeWithWireRecoveryV2({ wireRecovery, store, providerAdapter, egressBinding, priceUsage,
              classifyFailure: classifyStarcraftTmgStructuredFailureV2,
              outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [p.contract] }),
              contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({ entries: [p.capsule] }),
              executionPolicyRegistry: { resolve: q => hash(q.executionPolicyRef) === hash(policyRef)
                && hash(q.roleRef) === hash(p.roleRef) && hash(q.outputContractRef) === hash(p.job.outputContractRef)
                ? { ok: true, executionPolicy: policy } : { ok: false } },
              capabilityReceiptRegistry: { resolve: q => hash(q.providerProfileRef) === hash(egressBinding.providerProfileRef)
                && hash(q.outputContractRef) === hash(p.job.outputContractRef) && q.capability === 'responses_json_schema'
                ? { ok: true, capabilityReceipt: capability } : { ok: false } },
              readCandidate: ref => { const c = store.artifact(attemptId + '.candidate'); return c?.hash === ref.hash ? c : null; },
            });
            const input = { roleRef: p.roleRef, contextManifestRef: invocation.contextManifestRef, outputContractRef: p.job.outputContractRef,
              executionPolicyRef: policyRef, continuationRef: null };
            let outcome;
            const bridge = createStarcraftTmgStructuredDshModelBridgeV1({
              generate: async () => { outcome = await generated.generateStructured(input); return outcome; },
              readCandidate: generated.readCandidate, bindInvocation: () => input,
            });
            const loop = await dsh.run({ task: 'Review exactly fragmentTask ' + p.job.id + ' with all supplied context. Finish once with its schema.',
              callModel: bridge.callModel, toolPort: Object.freeze({ execute: async () => fail('FACTION_REVIEW_FRAGMENT_TOOL_FORBIDDEN'),
                trace: () => [], readRefs: () => [] }),
              limits: { maxCalls: 1, maxTools: 0, maxOutput: policy.maxOutputUnits, maxWallMs: 180000 } });
            if (outcome?.status !== 'accepted' || loop.calls !== 1 || loop.toolTrace.length) fail('FACTION_REVIEW_FRAGMENT_OUTCOME_REJECTED');
            part = store.finish(partLease, seal({ jobId: p.job.id, planHash: plan.hash, contextHash: p.capsule.hash,
              outputContractHash: p.contract.contractHash, value: loop.final, runId: store.summary().runId,
              attemptId, structuredCandidateRef: outcome.candidateRef, structuredRuntimeReceiptRef: outcome.receiptRef,
              loop, semanticAcceptance: false, trainingTruth: false }));
          }
        } catch (error) { store.release(partLease); throw error; }
        verifyFactionReviewFragmentRuntimeV1({ ...args, plan, part, prepared: p, egressBinding,
          capability, dshBindingHash: dsh.binding.hash, readSuccessEvidence, openingFenceRecovery });
        parts.push(part);
        options.onProgress?.({ stage: 'review_fragment_complete', job: p.job.id, completed: parts.length,
          total: plan.jobs.length, fromCache: partLease.cached === true, semanticAcceptance: false });
      }
      const assembly = assembleFactionReviewFragmentsV1({ ...args, plan, parts });
      return store.finish(lease, seal({ protocol: binding.version, plan, assembly,
        providerProfileRef: egressBinding.providerProfileRef,
        capabilityReceiptHashes: Object.fromEntries(preparations.map(p => [p.job.kind, capabilities[p.job.kind].receiptHash])),
        fragmentRefs: parts.map(p => ({ id: parentId(plan) + '.' + p.jobId, hash: p.hash })),
        output: assembly.output, originalFailurePreserved: true, originalAttemptsReissued: 0,
        semanticAcceptance: false, trainingTruth: false }));
    } catch (error) { store.release(lease); throw error; }
  } });
}

export function verifyFactionReviewFragmentRuntimeV1({ plan, part, prepared, egressBinding, capability, dshBindingHash, readSuccessEvidence, openingFenceRecovery }) {
  verifySeal(part);
  if (part.protocol === FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1) {
    const recovered = openingFenceForFactionFragmentV1({ prepared, recovery: openingFenceRecovery });
    if (!recovered) fail('FACTION_FRAGMENT_OPENING_FENCE_BINDING_DRIFT');
    const invocation = invocationFor(prepared, recovered.capability), request = providerRequestFor(prepared, invocation);
    // This is an already billed historic response, not a new dispatch. The
    // authenticated V2 origin binds the capability actually used for that call.
    checkCapability(recovered.capability, prepared, egressBinding, recovered.capability.probedAt);
    return verifyOpeningFenceFactionFragmentV1({ part, plan, prepared, egressBinding, invocation, request,
      dshBindingHash, recovery: openingFenceRecovery });
  }
  const proof = readSuccessEvidence({ runId: part.runId, attemptId: part.attemptId });
  const { attempt, candidate, runtimeReceipt } = proof;
  [candidate, runtimeReceipt].forEach(verifySeal);
  const response = verifySeal(JSON.parse(attempt.response)).value;
  const receipt = response.usageReceipt, { receiptHash, ...receiptBody } = receipt || {};
  const invocation = invocationFor(prepared, capability), request = providerRequestFor(prepared, invocation);
  const wire = { model: egressBinding.model, instructions: request.instructions, input: request.input,
    reasoning: { effort: 'none' }, temperature: egressBinding.temperature, top_p: egressBinding.topP,
    max_output_tokens: policy.maxOutputUnits, stream: false,
    text: { format: { type: 'json_schema', name: prepared.contract.schemaName, schema: prepared.contract.providerSchema } } };
  if (hash(receiptBody) !== receiptHash || receipt.requestBodyHash !== hash(wire)
    || receipt.requestId !== part.attemptId || receipt.responseFingerprint !== hash(candidate.providerValue)
    || hash(response.output) !== hash(candidate.providerValue) || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || receipt.requestedModel !== egressBinding.model || receipt.reportedModel !== egressBinding.model
    || hash(receipt.roleRef) !== hash(prepared.roleRef) || hash(receipt.outputContractRef) !== hash(prepared.job.outputContractRef)
    || receipt.capabilityReceiptHash !== capability.receiptHash
    || hash(receipt.usage) !== hash(verifySeal(JSON.parse(attempt.usage)).value)
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0
    || part.planHash !== plan.hash || part.jobId !== prepared.job.id || part.contextHash !== prepared.capsule.hash
    || part.outputContractHash !== prepared.contract.contractHash || part.semanticAcceptance !== false || part.trainingTruth !== false
    || attempt.run !== part.runId || attempt.state !== 'received' || attempt.id !== request.requestId
    || attempt.request_hash !== hash(request) || part.attemptId !== request.requestId
    || candidate.hash !== part.structuredCandidateRef.hash || runtimeReceipt.hash !== part.structuredRuntimeReceiptRef.hash
    || hash(candidate.providerValue) !== hash(part.value) || candidate.contextManifestRef.hash !== prepared.capsule.hash
    || hash(candidate.roleRef) !== hash(prepared.roleRef) || candidate.invocationHash !== hash(invocation)
    || hash(candidate.outputContractRef) !== hash(prepared.job.outputContractRef)
    || runtimeReceipt.invocationHash !== hash(invocation) || runtimeReceipt.candidateHash !== candidate.hash
    || runtimeReceipt.status !== 'accepted' || runtimeReceipt.attemptId !== part.attemptId
    || candidate.providerReceiptHash !== receiptHash || runtimeReceipt.providerReceiptHash !== receiptHash
    || runtimeReceipt.providerAttempts !== 1 || runtimeReceipt.automaticRetries !== 0 || runtimeReceipt.semanticAcceptance !== false
    || candidate.semanticAcceptanceInherited !== false || candidate.published !== false || candidate.runtimeAccepted !== false
    || candidate.trainingTruth !== false || runtimeReceipt.trainingTruth !== false
    || !validateStarcraftTmgProviderJsonSchemaValueV1(prepared.contract.providerSchema, part.value).ok)
    fail('FACTION_REVIEW_FRAGMENT_CONSUMER_PROVENANCE_DRIFT');
  checkCapability(capability, prepared, egressBinding, receipt.startedAt);
  const loop = verifySeal(part.loop);
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.directNetworkUsed !== false
    || loop.trainingTruth !== false || loop.calls !== 1 || loop.toolTrace.length || loop.transcript.length !== 1
    || loop.transcript[0].call !== 1 || loop.transcript[0].receiptHash !== runtimeReceipt.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify({ action: 'finish', content: part.value }))
    || hash(loop.final) !== hash(part.value)) fail('FACTION_REVIEW_FRAGMENT_CONSUMER_DSH_DRIFT');
  return { providerReceiptHash: receiptHash };
}

export function verifyFactionReviewDecompositionRuntimeV1(args) {
  const { value, resolveFragment, capabilities } = args;
  verifySeal(value);
  const plan = prepareFactionReviewDecompositionV1(args);
  if (value.protocol !== binding.version || value.plan.hash !== plan.hash
    || hash(value.providerProfileRef) !== hash(args.egressBinding.providerProfileRef)
    || hash(value.capabilityReceiptHashes) !== hash(Object.fromEntries(plan.jobs.map(j => [j.kind, capabilities[j.kind].receiptHash])))
    || value.semanticAcceptance !== false || value.trainingTruth !== false || value.originalAttemptsReissued !== 0
    || value.fragmentRefs.length !== plan.jobs.length || new Set(value.fragmentRefs.map(r => r.id)).size !== plan.jobs.length)
    fail('FACTION_REVIEW_DECOMPOSITION_CONSUMER_BINDING_DRIFT');
  const parts = [], receipts = [plan.origin.originalReceiptHash];
  for (const job of plan.jobs) {
    const id = parentId(plan) + '.' + job.id, ref = value.fragmentRefs.find(r => r.id === id);
    if (!ref) fail('FACTION_REVIEW_FRAGMENT_CONSUMER_REF_MISSING');
    const part = verifySeal(resolveFragment(id));
    if (part.hash !== ref.hash) fail('FACTION_REVIEW_FRAGMENT_CONSUMER_REF_DRIFT');
    const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
    const proof = verifyFactionReviewFragmentRuntimeV1({ ...args, plan, part, prepared, capability: capabilities[job.kind] });
    parts.push(part); receipts.push(proof.providerReceiptHash);
  }
  const assembly = assembleFactionReviewFragmentsV1({ ...args, plan, parts });
  if (value.assembly.hash !== assembly.hash || hash(value.output) !== hash(assembly.output))
    fail('FACTION_REVIEW_DECOMPOSITION_CONSUMER_ASSEMBLY_DRIFT');
  return seal({ version: binding.version + '.consumer', planHash: plan.hash, valueHash: value.hash,
    providerReceiptHashes: receipts, originalRawRecovered: false, exactNewRequestsRebuilt: true,
    actualStrategyEffectivenessProven: false, semanticAcceptanceInherited: false, trainingTruth: false });
}
