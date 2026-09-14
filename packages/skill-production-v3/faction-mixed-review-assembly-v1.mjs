import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  assembleFactionReviewFragmentsV1 } from './faction-review-decomposition-v1.mjs';
import { verifyFactionReviewFragmentRuntimeV1 } from './faction-review-decomposition-runtime-v1.mjs';
import { FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1, verifyFactionReplacementFragmentV1 } from './faction-ambiguous-replacement-runtime-v1.mjs';

export const FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 = seal({ version: 'faction_mixed_review_assembly_v1',
  executionIdentity: 'each_fragment_actual_paid_owner_model_capability_and_exact_invocation',
  inheritedResultsRebilled: false, originalUnknownSendReconciled: false,
  allJobsRequired: true, preserveNegativeAndUncertainJudgments: true,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
const binding = FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1;

// No egress here. A mixed-model result is not verified against a fictitious
// group-wide capability. Each child keeps its original paid execution identity.
export function verifyFactionMixedReviewAssemblyV1({ args, value, readFragment, resolveExecution,
  resolveReplacement, dshBindingHash }) {
  verifySeal(value);
  const plan = prepareFactionReviewDecompositionV1(args);
  if (value.protocol !== binding.version || value.bindingHash !== binding.hash || value.planHash !== plan.hash
    || hash(value.plan) !== hash(plan)
    || value.semanticAcceptance !== false || value.runtimeAccepted !== false || value.trainingTruth !== false
    || value.originalUnknownSendReconciled !== false || !Array.isArray(value.fragmentRefs)
    || value.fragmentRefs.length !== plan.jobs.length
    || new Set(value.fragmentRefs.map(r => r.jobId)).size !== plan.jobs.length)
    fail('FACTION_MIXED_REVIEW_BINDING_DRIFT');
  const parts = [], receipts = [plan.origin.originalReceiptHash];
  for (const job of plan.jobs) {
    const ref = value.fragmentRefs.find(r => r.jobId === job.id);
    if (!ref) fail('FACTION_MIXED_REVIEW_JOB_MISSING');
    const part = verifySeal(readFragment(ref));
    if (part.hash !== ref.hash || part.jobId !== job.id || part.planHash !== plan.hash
      || ref.runId !== part.runId || ref.attemptId !== part.attemptId)
      fail('FACTION_MIXED_REVIEW_FRAGMENT_DRIFT');
    const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
    let proof;
    if (part.protocol === FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1) {
      const replacement = resolveReplacement({ part, prepared, plan });
      if (!replacement || replacement.replacement.plan.hash !== plan.hash
        || replacement.replacement.prepared.capsule.hash !== prepared.capsule.hash)
        fail('FACTION_MIXED_REVIEW_REPLACEMENT_SCOPE');
      proof = verifyFactionReplacementFragmentV1({ ...replacement, part, dshBindingHash });
    } else {
      const execution = resolveExecution({ part, prepared, plan });
      if (!execution?.capability || !execution.egressBinding || typeof execution.readSuccessEvidence !== 'function')
        fail('FACTION_MIXED_REVIEW_EXECUTION_MISSING');
      proof = verifyFactionReviewFragmentRuntimeV1({ ...args, ...execution, plan, part, prepared, dshBindingHash });
    }
    if (!proof.providerReceiptHash) fail('FACTION_MIXED_REVIEW_PAID_PROOF_MISSING');
    receipts.push(proof.providerReceiptHash); parts.push(part);
  }
  const assembly = assembleFactionReviewFragmentsV1({ ...args, plan, parts });
  if (hash(value.assembly) !== hash(assembly) || hash(value.output) !== hash(assembly.output))
    fail('FACTION_MIXED_REVIEW_ASSEMBLY_DRIFT');
  return { providerReceiptHashes: receipts, semanticAcceptance: false, runtimeAccepted: false };
}

export function assembleFactionMixedReviewV1({ args, fragmentRefs, readFragment, resolveExecution,
  resolveReplacement, dshBindingHash }) {
  const plan = prepareFactionReviewDecompositionV1(args);
  const parts = fragmentRefs.map(ref => verifySeal(readFragment(ref)));
  const assembly = assembleFactionReviewFragmentsV1({ ...args, plan, parts });
  const value = seal({ protocol: binding.version, bindingHash: binding.hash, planHash: plan.hash, plan,
    fragmentRefs, assembly, output: assembly.output, originalUnknownSendReconciled: false,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
  verifyFactionMixedReviewAssemblyV1({ args, value, readFragment, resolveExecution, resolveReplacement, dshBindingHash });
  return value;
}
