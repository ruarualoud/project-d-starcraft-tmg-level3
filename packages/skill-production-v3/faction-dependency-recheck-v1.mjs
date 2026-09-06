import { createFactionSourceDependencyContextV1 } from './faction-source-dependency-context-v1.mjs';
import { validateTargetedFactionReviewV1 } from './faction-review-targets-v1.mjs';
import { validateFactionReviewV1 } from './faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, clone, fail } from '../skill-production/common.mjs';

// A bounded intervention on a captured review, not a reset of production's
// revision budget. Preserve the complete original draft and all source context;
// add only a source-derived reading packet. Neither previous judgments nor
// expected answers enter these fresh requests. No edit/promotion port exists.
export function planFactionDependencyRecheckV1({ input, captured }) {
  [input, captured].forEach(verifySeal);
  const request = captured.request, targets = request?.workspace?.outputRequestAtEnd?.targetContract;
  verifySeal(targets);
  if (request.workspace.inputHash !== input.hash || targets.inputHash !== input.hash
    || targets.draftHash !== hash(request.workspace.draft)
    || !request.roleId.includes('.review-target-batch-v1.supportive.')
    || !request.instruction.includes('角色supportive。') || captured.trainingTruth !== false)
    fail('FACTION_DEPENDENCY_RECHECK_CAPTURE_INVALID');
  const roots = [...new Set(targets.targets.flatMap(t => t.recommendation.sourceRefs))];
  const dependencyContext = createFactionSourceDependencyContextV1({ input, sourceRefs: roots });
  return seal({ version: 'faction_dependency_recheck_plan_v1', inputHash: input.hash, captureHash: captured.hash,
    originalRequestHash: hash(request), sectionId: request.workspace.section.id,
    draftHash: targets.draftHash, targetContractHash: targets.hash, dependencyContext,
    targetIndices: targets.targets.map(t => t.index), routes: ['supportive', 'adversarial'],
    fullSectionRecommendations: request.workspace.draft.recommendations.length,
    changedVariable: 'additional_source_dependency_reading_context_at_prompt_tail',
    productionRevisionBudgetReset: false, sourceRefreshPerformed: false, trainingTruth: false });
}

export async function recheckFactionDependencyContextV1({ input, captured, runtime, store, onProgress = () => {} }) {
  const plan = planFactionDependencyRecheckV1({ input, captured }), original = captured.request;
  const reviews = [];
  for (const route of plan.routes) {
    const request = { ...clone(original),
      roleId: plan.sectionId + '.dependency-recheck-v1.' + plan.hash.slice(0, 20) + '.' + route,
      instruction: original.instruction.replace('角色supportive。', '角色' + route + '。'),
      workspace: { ...clone(original.workspace), sourceDependencyContextAtEnd: plan.dependencyContext } };
    const artifact = await runtime.role(request);
    const bound = validateTargetedFactionReviewV1(artifact.output, original.workspace.outputRequestAtEnd.targetContract);
    validateFactionReviewV1(bound.review, { input, section: original.workspace.section,
      draft: original.workspace.draft, reviewIndices: original.workspace.reviewIndices,
      requiredSourceRefs: original.workspace.coverageRequiredSourceRefs });
    const row = seal({ route, artifactHash: artifact.hash, requestHash: hash(request), bound, trainingTruth: false });
    reviews.push(row); onProgress({ route, verdicts: bound.review.verdicts.map(v => ({ index: v.index, verdict: v.verdict })) });
  }
  const result = seal({ version: 'faction_dependency_recheck_result_v1', plan, reviews,
    inspectedTargets: plan.targetIndices.length, totalSectionRecommendations: plan.fullSectionRecommendations,
    allTargetVerdictsSupported: reviews.every(r => r.bound.review.verdicts.every(v => v.verdict === 'supported')),
    allAssignedCoverageSupported: reviews.every(r => r.bound.review.coverage.every(v => v.verdict === 'covered')),
    completeSectionSourceReviewPassed: false, actualRepairPerformed: false,
    oldProviderOutputsOverwritten: false, productionRevisionBudgetReset: false,
    actualRoomReplayPerformed: false, strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
  const lease = store.acquire('dependency-recheck.result', { resultHash: result.hash });
  return lease.cached ? verifySeal(lease.artifact) : store.finish(lease, result);
}
