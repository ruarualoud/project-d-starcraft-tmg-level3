import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from './faction-review-decomposition-v1.mjs';
import { factionReviewFragmentLeaseInputV1, verifyFactionReviewFragmentRuntimeV1 } from './faction-review-decomposition-runtime-v1.mjs';
import { assembleFactionMixedReviewV1, verifyFactionMixedReviewAssemblyV1,
  FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 } from './faction-mixed-review-assembly-v1.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../structured-generation/structured-runtime-selection-v2.mjs';
import { createStarcraftTmgContextCapsuleRegistryV1, contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgStructuredDshModelBridgeV1 } from '../structured-generation/dsh-command-mapper-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../structured-generation/failure-classifier-v2.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1, verifyFactionReplacementFragmentV1 } from './faction-ambiguous-replacement-runtime-v1.mjs';

const policy = FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy;
const policyRef = { id: 'policy.faction-review-fragment.production', version: 'v1', hash: hash(policy) };
const noTools = { execute: () => fail('FACTION_MIXED_REVIEW_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] };

// One ordinary, genuinely missing job. An unresolved predecessor must be routed
// to the separately authorized replacement runtime, never through this method.
export async function runFactionFreshReviewFragmentV1({ args, jobId, store, dsh, execution,
  providerAdapter, wireRecovery, priceUsage }) {
  const plan = prepareFactionReviewDecompositionV1(args);
  const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId });
  const { capability, egressBinding, readSuccessEvidence } = execution;
  if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: capability,
    providerProfileRef: egressBinding.providerProfileRef, endpointPath: egressBinding.endpoint.path,
    endpointDialect: egressBinding.endpointDialect, model: egressBinding.model, capability: 'responses_json_schema',
    outputContractRef: prepared.job.outputContractRef, now: new Date().toISOString() }).ok)
    fail('FACTION_MIXED_REVIEW_CAPABILITY_REQUIRED');
  const leaseInput = factionReviewFragmentLeaseInputV1({ prepared, capability, plan, dshBindingHash: dsh.binding.hash });
  const attemptId = 'structured-' + leaseInput.invocationHash.slice(0, 48);
  const lease = store.acquire('faction-review-decomposition.' + plan.hash + '.' + jobId, leaseInput, 1800000);
  const verify = part => verifyFactionReviewFragmentRuntimeV1({ ...args, ...execution, prepared, plan, part,
    dshBindingHash: dsh.binding.hash });
  try {
    if (lease.cached) { const part = verifySeal(lease.artifact); verify(part); return part; }
    const generated = createStructuredRuntimeWithWireRecoveryV2({ store, providerAdapter, wireRecovery,
      egressBinding, priceUsage, classifyFailure: classifyStarcraftTmgStructuredFailureV2,
      outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [prepared.contract] }),
      contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({ entries: [prepared.capsule] }),
      executionPolicyRegistry: { resolve: q => hash(q.executionPolicyRef) === hash(policyRef)
        && hash(q.roleRef) === hash(prepared.roleRef) && hash(q.outputContractRef) === hash(prepared.job.outputContractRef)
        ? { ok: true, executionPolicy: policy } : { ok: false } },
      capabilityReceiptRegistry: { resolve: q => hash(q.providerProfileRef) === hash(egressBinding.providerProfileRef)
        && hash(q.outputContractRef) === hash(prepared.job.outputContractRef) && q.capability === 'responses_json_schema'
        ? { ok: true, capabilityReceipt: capability } : { ok: false } },
      readCandidate: ref => { const candidate = store.artifact(attemptId + '.candidate'); return candidate?.hash === ref.hash ? candidate : null; } });
    const input = { roleRef: prepared.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(prepared.capsule),
      outputContractRef: prepared.job.outputContractRef, executionPolicyRef: policyRef, continuationRef: null };
    let outcome;
    const bridge = createStarcraftTmgStructuredDshModelBridgeV1({ generate: async () => {
      outcome = await generated.generateStructured(input); return outcome;
    }, readCandidate: generated.readCandidate, bindInvocation: () => input });
    const loop = await dsh.run({ task: 'Review exactly fragmentTask ' + jobId + ' with all supplied context. Finish once with its schema.',
      callModel: bridge.callModel, toolPort: noTools,
      limits: { maxCalls: 1, maxTools: 0, maxOutput: policy.maxOutputUnits, maxWallMs: 180000 } });
    if (outcome?.status !== 'accepted') fail('FACTION_MIXED_REVIEW_FRESH_OUTCOME_REJECTED');
    const part = seal({ jobId, planHash: plan.hash, contextHash: prepared.capsule.hash,
      outputContractHash: prepared.contract.contractHash, value: loop.final, runId: store.summary().runId,
      attemptId, structuredCandidateRef: outcome.candidateRef, structuredRuntimeReceiptRef: outcome.receiptRef,
      loop, semanticAcceptance: false, trainingTruth: false });
    verify(part); return store.finish(lease, part);
  } catch (error) { if (!lease.cached) store.release(lease); throw error; }
}

// Durable orchestration with explicit per-job provenance. The resolver must
// authenticate all inherited children before any new dispatch. Unknown delivery
// is a replacement job or a stop; neither missing data nor negative judgments
// create permission to repeat an old request.
export function createFactionMixedReviewRuntimeV1({ store, dsh, authenticatePlan, resolveJobs,
  resolveExecution, resolveReplacement, readFragment, executeFresh, executeReplacement, onProgress }) {
  return Object.freeze({ async run(args) {
    const stop = () => {
      if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    };
    stop();
    const plan = prepareFactionReviewDecompositionV1(args);
    if (authenticatePlan(args).hash !== plan.hash) fail('FACTION_MIXED_REVIEW_PLAN_DRIFT');
    const jobs = await resolveJobs({ args, plan });
    if (jobs.length !== plan.jobs.length || plan.jobs.some(j => jobs.filter(r => r.jobId === j.id).length !== 1)
      || jobs.some(j => !['inherited', 'fresh', 'replacement'].includes(j.kind)))
      fail('FACTION_MIXED_REVIEW_JOBS_INVALID');
    const verifyArgs = { args, readFragment, resolveExecution, resolveReplacement, dshBindingHash: dsh.binding.hash };
    for (const route of jobs.filter(j => j.kind === 'inherited')) {
      const part = verifySeal(readFragment(route.ref));
      const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: route.jobId });
      if (part.hash !== route.ref.hash || part.runId !== route.ref.runId || part.attemptId !== route.ref.attemptId)
        fail('FACTION_MIXED_REVIEW_INHERITED_DRIFT');
      if (part.protocol === FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1)
        verifyFactionReplacementFragmentV1({ ...resolveReplacement({ part, prepared, plan }), part, dshBindingHash: dsh.binding.hash });
      else verifyFactionReviewFragmentRuntimeV1({ ...args, ...resolveExecution({ part, prepared, plan }),
        part, prepared, plan, dshBindingHash: dsh.binding.hash });
    }
    const lease = store.acquire('faction-mixed-review.' + plan.hash, { planHash: plan.hash,
      bindingHash: FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1.hash, dshBindingHash: dsh.binding.hash }, 1800000);
    try {
      if (lease.cached) { verifyFactionMixedReviewAssemblyV1({ ...verifyArgs, value: lease.artifact }); return lease.artifact; }
      const refs = [];
      for (const job of plan.jobs) {
        stop();
        const route = jobs.find(r => r.jobId === job.id);
        const part = route.kind === 'inherited' ? verifySeal(readFragment(route.ref))
          : await (route.kind === 'replacement' ? executeReplacement : executeFresh)({ args, plan, route });
        if (part.jobId !== job.id || part.planHash !== plan.hash) fail('FACTION_MIXED_REVIEW_FRAGMENT_DRIFT');
        // Store references only: never copy paid attempts or reinterpret owner.
        const ref = { jobId: job.id, hash: part.hash, runId: part.runId, attemptId: part.attemptId };
        if (readFragment(ref)?.hash !== part.hash) fail('FACTION_MIXED_REVIEW_FRAGMENT_NOT_DURABLE');
        refs.push(ref);
        onProgress?.({ stage: 'mixed_review_fragment_complete', job: job.id, route: route.kind, completed: refs.length, total: plan.jobs.length });
      }
      const value = assembleFactionMixedReviewV1({ ...verifyArgs, fragmentRefs: refs });
      return store.finish(lease, value);
    } catch (error) { if (!lease.cached) store.release(lease); throw error; }
  } });
}
