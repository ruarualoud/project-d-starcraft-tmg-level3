import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 as binding } from './faction-mixed-review-assembly-v1.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 } from './faction-ambiguous-replacement-v1.mjs';
import { assertFactionMixedReviewRecipeV1, openFactionMixedReviewEnvironmentV1 } from './faction-mixed-review-environment-v1.mjs';
import { createFactionMixedReviewRuntimeV1, runFactionFreshReviewFragmentV1 } from './faction-mixed-review-runtime-v1.mjs';
import { createFactionReplacementFragmentRuntimeV1 } from './faction-ambiguous-replacement-runtime-v1.mjs';
import { factionReviewDecompositionArgsV1 } from './faction-review-decomposition-continuation-v1.mjs';

export const FACTION_MIXED_REVIEW_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-mixed-review-integration-v1.mjs',
  'packages/skill-production-v3/faction-mixed-review-environment-v1.mjs',
  'packages/skill-production-v3/faction-mixed-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-mixed-review-assembly-v1.mjs',
  'packages/skill-production-v3/faction-mixed-review-role-v1.mjs',
  'packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs',
  'packages/skill-production-v3/faction-ambiguous-replacement-runtime-v1.mjs',
  'packages/skill-production-v3/faction-replacement-dispatch-guard-v1.mjs',
  'packages/skill-production-v3/faction-model-lifecycle-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-lane-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/verify-ticket-18-mixed-review-runtime-v1.mjs',
  'scripts/verify-ticket-18-mixed-review-environment-v1.mjs',
  'scripts/verify-ticket-18-mixed-review-wiring-v1.mjs',
]);
function checkReadiness(readiness) {
  verifySeal(readiness);
  if (readiness.version !== 'faction_mixed_review_wiring_readiness_v1' || !readiness.passed
    || readiness.bindingHash !== binding.hash || !readiness.actualOriginalRequestAuthenticated
    || !readiness.fullColdConsumerPassed || !readiness.oldFragmentNotResent
    || !readiness.partialContinuationPassed || !readiness.replacementSingleUsePassed
    || !Array.isArray(readiness.legacyReviewRoleIds) || readiness.legacyReviewRoleIds.length !== 1
    || readiness.actualDshSessions < 1 || readiness.dshInjectionUsed !== false
    || readiness.providerCalls !== 0 || readiness.semanticAcceptance !== false
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_MIXED_REVIEW_FILES_V1].sort()))
    fail('FACTION_MIXED_REVIEW_READINESS_REQUIRED');
}
export function factionMixedReviewRecipeV1(readiness) {
  checkReadiness(readiness);
  return { mixedReviewBinding: binding, ambiguousReplacementBinding: FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1,
    mixedReviewReadinessHash: readiness.hash, mixedReviewLegacyRoleIds: readiness.legacyReviewRoleIds };
}
export function validateFactionMixedReviewMigrationV1({ parent, next, readiness }) {
  if (!parent.mixedReviewBinding && !next.mixedReviewBinding) {
    if (readiness) fail('FACTION_MIXED_REVIEW_MIGRATION_UNSCOPED');
    return null;
  }
  checkReadiness(readiness);
  if (!assertFactionMixedReviewRecipeV1(next) || next.mixedReviewReadinessHash !== readiness.hash
    || parent.mixedReviewBinding && !assertFactionMixedReviewRecipeV1(parent)
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash']
      .some(k => hash(parent[k]) !== hash(next[k]))) fail('FACTION_MIXED_REVIEW_MIGRATION_INVALID');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_MIXED_REVIEW_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_mixed_review_migration_v1', bindingHash: binding.hash,
    readinessHash: readiness.hash, files: readiness.codeHashes.map(r => r.file),
    originalUnknownSendReconciled: false, originalAttemptsCopied: 0, accountingReset: false,
    semanticAcceptanceInherited: false, trainingTruth: false });
}

// Both source bodies and actual model identities come from authenticated
// journal evidence, not from the new group's preferred model setting.
export function createFactionMixedProductionRuntimeV1({ filename, recipe, parentRunId, parentRecipe,
  input, diagnosis, openingFenceRecovery, store, dsh, providerAdapter, wireRecovery,
  egressBinding, capabilities, priceUsage, onProgress }) {
  const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
  const environment = openFactionMixedReviewEnvironmentV1({ filename, recipe, parentRunId, parentRecipe, args, openingFenceRecovery });
  const replacementRuntime = createFactionReplacementFragmentRuntimeV1({ filename, store, dsh, providerAdapter, wireRecovery,
    priceUsage, allowedRunIds: environment.allowedRunIds, readSuccessEvidence: environment.readSuccessEvidence,
    readCapabilityReceipt: environment.readCapabilityReceipt, onProgress });
  const runtime = createFactionMixedReviewRuntimeV1({ store, dsh,
    authenticatePlan: actualArgs => {
      if (actualArgs.capsule.hash !== args.capsule.hash || actualArgs.evidence.hash !== args.evidence.hash
        || hash(actualArgs.mapping) !== hash(args.mapping)) fail('FACTION_MIXED_REVIEW_CALLER_DRIFT');
      return environment.plan;
    }, resolveJobs: environment.resolveJobs, readFragment: environment.readFragment,
    resolveExecution: environment.resolveExecution, resolveReplacement: environment.resolveReplacement,
    executeFresh: ({ plan, route }) => {
      const job = plan.jobs.find(j => j.id === route.jobId);
      const capability = environment.readCapabilityReceipt(capabilities[job.kind].receiptHash);
      return runFactionFreshReviewFragmentV1({ args, jobId: job.id, store, dsh,
        execution: { capability, egressBinding, readSuccessEvidence: environment.readSuccessEvidence },
        providerAdapter, wireRecovery, priceUsage });
    }, executeReplacement: ({ route }) => {
      const replacement = environment.prepareReplacement({ capability: capabilities.target });
      if (route.originalAttemptId !== replacement.replacement.grant.originAttemptId)
        fail('FACTION_MIXED_REVIEW_REPLACEMENT_SCOPE');
      return replacementRuntime.run(replacement);
    }, onProgress });
  return { run: runtime.run, environment, close: environment.close };
}
